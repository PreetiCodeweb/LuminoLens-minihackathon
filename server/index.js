require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const faceScanRoutes = require("./routes/faceScans");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/face-scans", faceScanRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true, service: "luminolens-saas" }));

// Serve the frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// Fallback 404 for unknown API routes
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`\n✨ LuminoLens SaaS running at http://localhost:${PORT}\n`);
});
