const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "luminolens.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT NOT NULL DEFAULT 'Eyeglasses',
  description TEXT,
  features TEXT,          -- JSON array as text
  face_shapes TEXT,        -- comma separated: round,oval,square,heart,diamond,oblong
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 50,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'Placed', -- Placed, Processing, Shipped, Out for Delivery, Delivered, Cancelled
  subtotal REAL NOT NULL,
  shipping_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  shipping_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  shipping_phone TEXT,
  payment_method TEXT DEFAULT 'Cash on Delivery',
  face_shape TEXT,         -- face shape detected at time of order, if any
  estimated_delivery TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  title TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS face_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  face_shape TEXT NOT NULL,
  metrics TEXT,             -- JSON of computed ratios, for debugging/analytics
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function seed() {
  const userCount = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  if (userCount === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    insertUser.run(
      "LuminoLens Admin",
      "admin@luminolens.com",
      bcrypt.hashSync("admin123", 10),
      "admin"
    );
    insertUser.run(
      "Demo Customer",
      "customer@luminolens.com",
      bcrypt.hashSync("customer123", 10),
      "customer"
    );
    console.log("Seeded users: admin@luminolens.com / admin123, customer@luminolens.com / customer123");
  }

  const productCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (title, price, category, description, features, face_shapes, image_url, stock, review_count)
      VALUES (@title, @price, @category, @description, @features, @face_shapes, @image_url, @stock, @review_count)
    `);
    const products = [
      {
        title: "Vintage Round Frames",
        price: 99.99,
        category: "Eyeglasses",
        description:
          "Classic round frames made with high-quality metal and a soft matte finish. Perfect for those who favor a timeless look.",
        features: JSON.stringify(["Metal rims", "Tortoise shell tips", "Unisex", "Includes case"]),
        face_shapes: "square,oblong,heart",
        image_url:
          "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/52a0ea5a-0c9b-4960-9143-0be3640cad54.png",
        stock: 40,
        review_count: 24,
      },
      {
        title: "Modern Squared Frames",
        price: 119.99,
        category: "Eyeglasses",
        description:
          "Sleek squared frames crafted from premium acetate, blending contemporary design with robust comfort.",
        features: JSON.stringify(["Acetate body", "Polished finish", "Comfy nose pads"]),
        face_shapes: "round,oval,heart",
        image_url:
          "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/92dda271-0948-4fab-bbce-973a6dc79daf.png",
        stock: 35,
        review_count: 48,
      },
      {
        title: "Minimalist Metal Frames",
        price: 109.99,
        category: "Blue Light",
        description:
          "Elegant, ultra-thin frames for those who prefer subtlety with maximum style and durability.",
        features: JSON.stringify(["Ultra-lightweight", "Dark matte finish", "Blue light filter"]),
        face_shapes: "round,oval,diamond",
        image_url:
          "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/adfcf5ba-4141-4202-a67e-a0bf8290840f.png",
        stock: 60,
        review_count: 16,
      },
      {
        title: "Rimless Clear View",
        price: 89.99,
        category: "Eyeglasses",
        description:
          "Lightweight rimless design with anti-reflective coating, ideal for long work sessions.",
        features: JSON.stringify(["Rimless", "Anti-reflective", "Clear lenses"]),
        face_shapes: "round,square,oval",
        image_url: "https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/85f9de172117545.6479a012a6237.jpg",
        stock: 50,
        review_count: 32,
      },
      {
        title: "Crystal Clear Frames",
        price: 95.99,
        category: "Blue Light",
        description: "Transparent polycarbonate frames with blue filter lenses—modern and subtle.",
        features: JSON.stringify(["Transparent look", "Lightweight", "Durable"]),
        face_shapes: "oval,heart,diamond",
        image_url: "https://tse4.mm.bing.net/th/id/OIP.19BXJQfdmSOmrVBt8JqrzgHaEJ",
        stock: 45,
        review_count: 22,
      },
      {
        title: "Techwear Edge Frames",
        price: 129.99,
        category: "Sunglasses",
        description: "Futuristic edge-cut design inspired by techwear aesthetics, perfect for trendsetters.",
        features: JSON.stringify(["Bold design", "Sturdy edges", "UV protection"]),
        face_shapes: "oval,oblong,diamond",
        image_url: "https://img.joomcdn.net/aa4ee44d15fba5c87abf4c4257a2a59e2af02db3_original.jpeg",
        stock: 30,
        review_count: 12,
      },
    ];
    const insertMany = db.transaction((items) => {
      for (const p of items) insertProduct.run(p);
    });
    insertMany(products);
    console.log("Seeded", products.length, "products");
  }
}

seed();

if (require.main === module && process.argv.includes("--seed")) {
  console.log("Seed complete.");
}

module.exports = db;
