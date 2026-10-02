const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

function formatOrder(order) {
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
  return { ...order, items };
}

// Create an order from the cart the client sends us
router.post("/", requireAuth, (req, res) => {
  const { items, shipping, faceShape } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }
  if (!shipping || !shipping.name || !shipping.address || !shipping.city || !shipping.zip || !shipping.phone) {
    return res.status(400).json({ error: "Complete shipping details are required" });
  }

  // Re-price server-side from the DB so client can't tamper with prices
  const productStmt = db.prepare("SELECT * FROM products WHERE id = ? AND is_active = 1");
  const resolvedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = productStmt.get(item.productId);
    if (!product) return res.status(400).json({ error: `Product ${item.productId} is unavailable` });
    const qty = Math.max(1, Math.min(10, parseInt(item.quantity, 10) || 1));
    if (product.stock < qty) {
      return res.status(400).json({ error: `Not enough stock for "${product.title}"` });
    }
    const lineTotal = product.price * qty;
    subtotal += lineTotal;
    resolvedItems.push({
      product_id: product.id,
      title: product.title,
      price: product.price,
      quantity: qty,
      image_url: product.image_url,
    });
  }

  const shippingFee = subtotal >= 100 ? 0 : 7.99;
  const total = subtotal + shippingFee;
  const estimatedDelivery = addBusinessDays(new Date(), 5).toISOString().slice(0, 10);

  const insertOrder = db.prepare(`
    INSERT INTO orders
      (user_id, status, subtotal, shipping_fee, total, shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_phone, payment_method, face_shape, estimated_delivery)
    VALUES (@user_id, 'Placed', @subtotal, @shipping_fee, @total, @shipping_name, @shipping_address, @shipping_city, @shipping_state, @shipping_zip, @shipping_phone, @payment_method, @face_shape, @estimated_delivery)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, title, price, quantity, image_url)
    VALUES (@order_id, @product_id, @title, @price, @quantity, @image_url)
  `);
  const decrementStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

  const createOrder = db.transaction(() => {
    const info = insertOrder.run({
      user_id: req.user.id,
      subtotal,
      shipping_fee: shippingFee,
      total,
      shipping_name: shipping.name,
      shipping_address: shipping.address,
      shipping_city: shipping.city,
      shipping_state: shipping.state || "",
      shipping_zip: shipping.zip,
      shipping_phone: shipping.phone,
      payment_method: shipping.paymentMethod || "Cash on Delivery",
      face_shape: faceShape || null,
      estimated_delivery: estimatedDelivery,
    });
    for (const item of resolvedItems) {
      insertItem.run({ order_id: info.lastInsertRowid, ...item });
      decrementStock.run(item.quantity, item.product_id);
    }
    return info.lastInsertRowid;
  });

  const orderId = createOrder();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  res.status(201).json({ order: formatOrder(order) });
});

router.get("/", requireAuth, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json({ orders: orders.map(formatOrder) });
});

router.get("/:id", requireAuth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized to view this order" });
  }
  res.json({ order: formatOrder(order) });
});

module.exports = router;
