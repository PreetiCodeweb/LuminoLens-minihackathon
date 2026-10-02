// Shared helpers used across every page.

const Auth = {
  getToken() {
    return localStorage.getItem("ll_token");
  },
  getUser() {
    const raw = localStorage.getItem("ll_user");
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem("ll_token", token);
    localStorage.setItem("ll_user", JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem("ll_token");
    localStorage.removeItem("ll_user");
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  isAdmin() {
    const u = this.getUser();
    return !!u && u.role === "admin";
  },
};

async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

const Cart = {
  KEY: "ll_cart",
  get() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : [];
  },
  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    Cart.updateBadge();
  },
  add(product, qty = 1) {
    const items = this.get();
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity = Math.min(10, existing.quantity + qty);
    } else {
      items.push({
        productId: product.id,
        title: product.title,
        price: product.price,
        image: product.image_url,
        quantity: qty,
      });
    }
    this.save(items);
  },
  updateQty(productId, qty) {
    let items = this.get();
    if (qty <= 0) {
      items = items.filter((i) => i.productId !== productId);
    } else {
      const item = items.find((i) => i.productId === productId);
      if (item) item.quantity = Math.min(10, qty);
    }
    this.save(items);
  },
  remove(productId) {
    this.save(this.get().filter((i) => i.productId !== productId));
  },
  clear() {
    this.save([]);
  },
  count() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  },
  subtotal() {
    return this.get().reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
  updateBadge() {
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      const count = Cart.count();
      el.textContent = count;
      el.classList.toggle("hidden", count === 0);
    });
  },
};

function showToast(message, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  const bg = type === "error" ? "#b64949" : "#587668";
  toast.innerHTML = `<div style="background:${bg}" class="text-white px-5 py-3 rounded-lg shadow-xl">${message}</div>`;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 3000);
}

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function statusClass(status) {
  return `status-${String(status).replace(/\s+/g, "-")}`;
}

function requireLoginOrRedirect(redirectTo) {
  if (!Auth.isLoggedIn()) {
    window.location.href = `login.html?next=${encodeURIComponent(redirectTo || window.location.pathname)}`;
    return false;
  }
  return true;
}

// Populate the shared nav auth area + cart badge on every page
function renderNavAuthState() {
  const container = document.querySelector("[data-nav-auth]");
  if (!container) return;
  const user = Auth.getUser();
  if (user) {
    container.innerHTML = `
      <a href="orders.html" class="hover:text-[var(--color-2)]">My Orders</a>
      ${user.role === "admin" ? '<a href="admin/dashboard.html" class="hover:text-[var(--color-2)]">Admin</a>' : ""}
      <button id="logoutBtn" class="hover:text-[var(--color-2)]">Logout (${user.name.split(" ")[0]})</button>
    `;
    const btn = document.getElementById("logoutBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        Auth.clearSession();
        showToast("Logged out");
        setTimeout(() => (window.location.href = "index.html"), 600);
      });
    }
  } else {
    container.innerHTML = `<a href="login.html" class="hover:text-[var(--color-2)]">Login</a>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavAuthState();
  Cart.updateBadge();
});
