const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAdmin);

function formatProduct(p) {
  return {
    ...p,
    features: p.features ? JSON.parse(p.features) : [],
    face_shapes: p.face_shapes ? p.face_shapes.split(",").map((s) => s.trim()) : [],
  };
}

// ---- Products ----

router.get("/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json({ products: rows.map(formatProduct) });
});

router.post("/products", (req, res) => {
  const { title, price, category, description, features, faceShapes, imageUrl, stock } = req.body;
  if (!title || price == null || !category) {
    return res.status(400).json({ error: "title, price and category are required" });
  }
  const info = db
    .prepare(`
      INSERT INTO products (title, price, category, description, features, face_shapes, image_url, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      title,
      parseFloat(price),
      category,
      description || "",
      JSON.stringify(Array.isArray(features) ? features : String(features || "").split(",").map((s) => s.trim()).filter(Boolean)),
      Array.isArray(faceShapes) ? faceShapes.join(",") : String(faceShapes || ""),
      imageUrl || "",
      parseInt(stock, 10) || 0
    );
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ product: formatProduct(product) });
});

router.put("/products/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const { title, price, category, description, features, faceShapes, imageUrl, stock, isActive } = req.body;
  db.prepare(`
    UPDATE products SET
      title = ?, price = ?, category = ?, description = ?, features = ?, face_shapes = ?, image_url = ?, stock = ?, is_active = ?
    WHERE id = ?
  `).run(
    title ?? existing.title,
    price != null ? parseFloat(price) : existing.price,
    category ?? existing.category,
    description ?? existing.description,
    features
      ? JSON.stringify(Array.isArray(features) ? features : String(features).split(",").map((s) => s.trim()).filter(Boolean))
      : existing.features,
    faceShapes != null ? (Array.isArray(faceShapes) ? faceShapes.join(",") : faceShapes) : existing.face_shapes,
    imageUrl ?? existing.image_url,
    stock != null ? parseInt(stock, 10) : existing.stock,
    isActive != null ? (isActive ? 1 : 0) : existing.is_active,
    req.params.id
  );
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  res.json({ product: formatProduct(product) });
});

router.delete("/products/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Orders ----

router.get("/orders", (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?");
  const users = db.prepare("SELECT id, name, email FROM users WHERE id = ?");
  res.json({
    orders: orders.map((o) => ({
      ...o,
      items: items.all(o.id),
      customer: users.get(o.user_id),
    })),
  });
});

const VALID_STATUSES = ["Placed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];

router.put("/orders/:id/status", (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(", ")}` });
  }
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });
  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  res.json({ order });
});

// ---- Dashboard stats ----

router.get("/stats", (req, res) => {
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(total),0) t FROM orders WHERE status != 'Cancelled'").get().t;
  const totalOrders = db.prepare("SELECT COUNT(*) c FROM orders").get().c;
  const totalProducts = db.prepare("SELECT COUNT(*) c FROM products WHERE is_active = 1").get().c;
  const totalCustomers = db.prepare("SELECT COUNT(*) c FROM users WHERE role = 'customer'").get().c;
  const topFaceShapes = db
    .prepare("SELECT face_shape, COUNT(*) c FROM face_scans GROUP BY face_shape ORDER BY c DESC")
    .all();
  const ordersByStatus = db.prepare("SELECT status, COUNT(*) c FROM orders GROUP BY status").all();
  const lowStock = db.prepare("SELECT id, title, stock FROM products WHERE stock <= 5 AND is_active = 1").all();

  res.json({ totalRevenue, totalOrders, totalProducts, totalCustomers, topFaceShapes, ordersByStatus, lowStock });
});

module.exports = router;
