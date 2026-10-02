function gateAdmin() {
  if (!Auth.isLoggedIn()) {
    window.location.href = "../login.html?next=admin/dashboard.html";
    return false;
  }
  if (!Auth.isAdmin()) {
    showToast("Admin access only", "error");
    setTimeout(() => (window.location.href = "../index.html"), 800);
    return false;
  }
  return true;
}

async function loadStats() {
  const stats = await api("/admin/stats", { auth: true });
  document.getElementById("statRevenue").textContent = money(stats.totalRevenue);
  document.getElementById("statOrders").textContent = stats.totalOrders;
  document.getElementById("statProducts").textContent = stats.totalProducts;
  document.getElementById("statCustomers").textContent = stats.totalCustomers;

  if (stats.lowStock.length > 0) {
    const alertBox = document.getElementById("lowStockAlert");
    alertBox.classList.remove("hidden");
    alertBox.innerHTML =
      "⚠️ Low stock: " + stats.lowStock.map((p) => `${p.title} (${p.stock} left)`).join(", ");
  }
}

let PRODUCTS_CACHE = [];

function productRowHTML(p) {
  return `
    <tr class="border-t" data-id="${p.id}">
      <td class="p-3"><img src="${p.image_url}" class="w-12 h-12 object-cover rounded" onerror="this.style.display='none';" /></td>
      <td class="p-3 font-medium">${p.title}</td>
      <td class="p-3">${p.category}</td>
      <td class="p-3">${money(p.price)}</td>
      <td class="p-3">${p.stock}</td>
      <td class="p-3 text-xs">${(p.face_shapes || []).join(", ") || "—"}</td>
      <td class="p-3">${p.is_active ? "✅" : "🚫"}</td>
      <td class="p-3 whitespace-nowrap">
        <button class="text-[var(--color-3)] font-semibold mr-3" data-action="edit">Edit</button>
        <button class="text-red-700 font-semibold" data-action="delete">Delete</button>
      </td>
    </tr>
  `;
}

async function loadProducts() {
  const { products } = await api("/admin/products", { auth: true });
  PRODUCTS_CACHE = products;
  document.getElementById("productCount").textContent = products.length;
  document.getElementById("productTableBody").innerHTML = products.map(productRowHTML).join("");
}

function openProductModal(product = null) {
  document.getElementById("productModalTitle").textContent = product ? "Edit Product" : "Add Product";
  document.getElementById("pId").value = product ? product.id : "";
  document.getElementById("pTitle").value = product ? product.title : "";
  document.getElementById("pPrice").value = product ? product.price : "";
  document.getElementById("pStock").value = product ? product.stock : 20;
  document.getElementById("pCategory").value = product ? product.category : "";
  document.getElementById("pImage").value = product ? product.image_url : "";
  document.getElementById("pDescription").value = product ? product.description : "";
  document.getElementById("pFeatures").value = product ? (product.features || []).join(", ") : "";
  document.getElementById("pActive").checked = product ? !!product.is_active : true;
  document.querySelectorAll(".face-shape-cb").forEach((cb) => {
    cb.checked = product ? (product.face_shapes || []).includes(cb.value) : false;
  });
  document.getElementById("productModal").classList.add("active");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("active");
}

document.getElementById("newProductBtn").addEventListener("click", () => openProductModal());

document.getElementById("productTableBody").addEventListener("click", async (e) => {
  const row = e.target.closest("tr");
  if (!row) return;
  const id = parseInt(row.dataset.id, 10);
  const action = e.target.dataset.action;

  if (action === "edit") {
    const product = PRODUCTS_CACHE.find((p) => p.id === id);
    openProductModal(product);
  }
  if (action === "delete") {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api(`/admin/products/${id}`, { method: "DELETE", auth: true });
      showToast("Product deleted");
      loadProducts();
      loadStats();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
});

document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("pId").value;
  const faceShapes = Array.from(document.querySelectorAll(".face-shape-cb:checked")).map((cb) => cb.value);
  const payload = {
    title: document.getElementById("pTitle").value.trim(),
    price: parseFloat(document.getElementById("pPrice").value),
    stock: parseInt(document.getElementById("pStock").value, 10),
    category: document.getElementById("pCategory").value.trim(),
    imageUrl: document.getElementById("pImage").value.trim(),
    description: document.getElementById("pDescription").value.trim(),
    features: document.getElementById("pFeatures").value.split(",").map((s) => s.trim()).filter(Boolean),
    faceShapes,
    isActive: document.getElementById("pActive").checked,
  };

  try {
    if (id) {
      await api(`/admin/products/${id}`, { method: "PUT", auth: true, body: payload });
      showToast("Product updated");
    } else {
      await api("/admin/products", { method: "POST", auth: true, body: payload });
      showToast("Product added");
    }
    closeProductModal();
    loadProducts();
    loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---- Orders tab ----

const ORDER_STATUSES = ["Placed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];

function adminOrderHTML(order) {
  return `
    <div class="bg-white rounded-xl shadow p-5" data-order-id="${order.id}">
      <div class="flex flex-wrap justify-between gap-2 items-start mb-2">
        <div>
          <p class="font-semibold">Order #${order.id} — ${order.customer ? order.customer.name : "Unknown"}</p>
          <p class="text-xs text-[var(--color-4)]">${order.customer ? order.customer.email : ""} · ${new Date(order.created_at).toLocaleString()}</p>
        </div>
        <span class="status-pill ${statusClass(order.status)}">${order.status}</span>
      </div>
      <p class="text-sm mb-2">${order.items.map((i) => `${i.title} × ${i.quantity}`).join(", ")}</p>
      <p class="text-sm text-[var(--color-4)] mb-3">Ship to: ${order.shipping_address}, ${order.shipping_city} ${order.shipping_zip} · ${order.shipping_phone}</p>
      <div class="flex items-center justify-between">
        <p class="font-bold">${money(order.total)}</p>
        <select class="form-input w-auto order-status-select" data-id="${order.id}">
          ${ORDER_STATUSES.map((s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

async function loadAdminOrders() {
  const { orders } = await api("/admin/orders", { auth: true });
  document.getElementById("adminOrdersList").innerHTML = orders.map(adminOrderHTML).join("");
}

document.getElementById("adminOrdersList").addEventListener("change", async (e) => {
  if (!e.target.classList.contains("order-status-select")) return;
  const id = e.target.dataset.id;
  const status = e.target.value;
  try {
    await api(`/admin/orders/${id}/status`, { method: "PUT", auth: true, body: { status } });
    showToast(`Order #${id} marked ${status}`);
    loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("bg-[var(--color-5)]", "text-white");
      b.classList.add("bg-white");
    });
    btn.classList.add("bg-[var(--color-5)]", "text-white");
    btn.classList.remove("bg-white");

    document.getElementById("tab-products").classList.toggle("hidden", btn.dataset.tab !== "products");
    document.getElementById("tab-orders").classList.toggle("hidden", btn.dataset.tab !== "orders");
    if (btn.dataset.tab === "orders") loadAdminOrders();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  if (!gateAdmin()) return;
  loadStats();
  loadProducts();
});
