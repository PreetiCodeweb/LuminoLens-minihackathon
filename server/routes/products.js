const express = require("express");
const db = require("../db");

const router = express.Router();

function formatProduct(p) {
  return {
    ...p,
    features: p.features ? JSON.parse(p.features) : [],
    face_shapes: p.face_shapes ? p.face_shapes.split(",").map((s) => s.trim()) : [],
  };
}

// GET /api/products?category=&faceShape=&search=
router.get("/", (req, res) => {
  const { category, faceShape, search } = req.query;
  let sql = "SELECT * FROM products WHERE is_active = 1";
  const params = [];

  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (faceShape) {
    sql += " AND (',' || face_shapes || ',') LIKE ?";
    params.push(`%,${faceShape},%`);
  }
  if (search) {
    sql += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json({ products: rows.map(formatProduct) });
});

router.get("/categories", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT category FROM products WHERE is_active = 1").all();
  res.json({ categories: rows.map((r) => r.category) });
});

router.get("/:id", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ product: formatProduct(product) });
});

module.exports = router;
