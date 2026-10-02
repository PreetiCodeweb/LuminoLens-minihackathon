# 🌟 LuminoLens — AI-Matched Eyewear SaaS

A full-stack e-commerce site for LuminoLens: customers scan their face right in the
browser to get a frame-shape recommendation, shop a real product catalog, place
orders and track delivery — and you manage everything (products, stock, orders,
delivery status) from an admin dashboard.

## ✨ What's included

- **AI face-shape scan** — webcam-based, runs entirely client-side with
  [face-api.js](https://github.com/justadudewhohacks/face-api.js) (68-point facial
  landmarks). Classifies Round / Oval / Square / Heart / Diamond / Oblong and
  recommends frames tagged for that shape. No photos are ever uploaded — only the
  detected shape label is stored.
- **Product catalog** with categories, stock, features and face-shape tags.
- **Cart → checkout → order** flow with server-side price recalculation (so the
  cart can't be tampered with from the browser) and stock decrementing.
- **Order tracking** for customers, with a visual delivery-stage progress bar
  (Placed → Processing → Shipped → Out for Delivery → Delivered).
- **Admin dashboard** — add/edit/delete products (with image URL, price, stock,
  face-shape tags), update order status, see revenue/orders/low-stock at a glance.
- **Accounts** — register/login (JWT-based), customer vs admin roles.
- **SQLite** database (via `better-sqlite3`) — a single file, no external database
  server to install or configure.

## 🚀 Getting started

### 1. Prerequisites

- [Node.js](https://nodejs.org) v18 or newer

### 2. Install & run

```bash
cd luminolens-saas
npm install
cp .env.example .env      # optional: edit JWT_SECRET before going to production
npm start
```

Open **http://localhost:3000** — that's it. The SQLite database is created
automatically on first run at `data/luminolens.db`, seeded with 6 starter products
and two demo accounts:

| Role     | Email                     | Password      |
|----------|----------------------------|---------------|
| Admin    | admin@luminolens.com       | admin123      |
| Customer | customer@luminolens.com    | customer123   |

**Change these before deploying anywhere public** — go to the admin dashboard,
or update them directly in the database.

### 3. Try it out

1. Visit the homepage, click **📷 Scan My Face**, allow camera access, and hit
   "Analyze My Face" — you'll get a face-shape result and matching frames.
2. Add a few frames to your cart, log in (or register), and place an order.
3. Log in as the admin (`admin@luminolens.com`) and open **Admin** in the nav to:
   - Add new products (with an image URL, price, stock and which face shapes
     they suit).
   - Update an order's delivery status and watch the customer's tracker update.

## 🧠 How the face-shape scan works

`face-api.js`'s tiny face detector finds your face in the webcam feed and
extracts 68 facial landmarks. The app then computes a few ratios — face
length-to-width, jaw width vs. cheekbone width, forehead width vs. cheekbone
width — and classifies the closest matching shape from that. It's a fast,
lightweight heuristic (not a clinical measurement), tuned to give a sensible
frame recommendation rather than a perfectly precise geometric classification.
The model files load from a public CDN the first time the page runs, so the
face-scan page needs an internet connection even though your video never
leaves the browser.

## 🗂️ Project structure

```
luminolens-saas/
├── server/               # Express API
│   ├── index.js          # app entry point
│   ├── db.js             # SQLite schema + seed data
│   ├── middleware/auth.js
│   └── routes/           # auth, products, orders, admin, face-scans
├── public/                # static frontend (no build step needed)
│   ├── index.html         # home / shop
│   ├── face-scan.html     # AI face scan
│   ├── cart.html          # cart + checkout
│   ├── orders.html        # order history + tracking
│   ├── login.html / register.html
│   ├── about.html
│   ├── admin/dashboard.html
│   ├── css/style.css
│   └── js/                # api.js (shared), main.js, cart.js, orders.js,
│                           # face-scan.js, admin.js
├── data/                  # luminolens.db is created here on first run
├── package.json
└── .env.example
```

## 🛒 Adding more product varieties

You don't need to touch code — log in as admin, go to **Admin → Products →
+ Add Product**, and fill in the title, price, stock, category, image URL,
description, features and which face shapes it suits. It appears in the
storefront (and in face-scan recommendations) immediately.

## 📦 Deploying

This is a normal Node.js + SQLite app, so it runs on any host that runs
Node (Render, Railway, Fly.io, a VPS, etc.):

1. Set a strong `JWT_SECRET` in your environment.
2. `npm install && npm start` (or use a process manager like `pm2`).
3. Since SQLite is a single file, make sure your host's disk persists
   between deploys/restarts (or swap in Postgres/MySQL later if you outgrow
   it — the queries are isolated in `server/db.js` and the route files).

## 🔒 Notes on scope

This is a complete, working reference implementation suitable for a real
small storefront or as a foundation to keep building on. Before taking real
payments in production you'd want to add a real payment gateway (Stripe,
Razorpay, etc.) instead of the current "Cash/Card/UPI on Delivery" selector,
plus HTTPS, rate limiting, and email notifications for order updates.
