let ALL_PRODUCTS = [];

function productCardHTML(p, { badge } = {}) {
  return `
    <div class="product-card fade-slide-in shadow-md cursor-pointer" onclick="showProductDetails(${p.id})">
      <div class="overflow-hidden rounded-t-md relative">
        ${badge ? `<span class="recommended-badge absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full z-10">${badge}</span>` : ""}
        <img src="${p.image_url}" alt="${p.title}" class="w-full h-56 object-cover object-center transition-transform duration-300 ease-in-out hover:scale-110" onerror="this.style.display='none';" />
      </div>
      <div class="p-6">
        <p class="text-xs uppercase tracking-wide text-[var(--color-3)] font-semibold mb-1">${p.category}</p>
        <h3 class="text-xl font-semibold text-[var(--color-4)] mb-2">${p.title}</h3>
        <p class="text-[var(--color-5)] mb-4 line-clamp-2">${p.description || ""}</p>
        <div class="flex items-center justify-between">
          <span class="text-lg font-bold text-[var(--color-3)]">${money(p.price)}</span>
          <span class="text-xs text-[var(--color-4)]">${p.stock > 0 ? p.stock + " in stock" : "Out of stock"}</span>
        </div>
      </div>
    </div>
  `;
}

async function loadProducts(category = "") {
  const grid = document.getElementById("productGrid");
  try {
    const { products } = await api(`/products${category ? `?category=${encodeURIComponent(category)}` : ""}`);
    ALL_PRODUCTS = products;
    grid.innerHTML = products.length
      ? products.map((p) => productCardHTML(p)).join("")
      : `<p class="col-span-full text-center text-[var(--color-5)]">No products in this category yet.</p>`;
  } catch (err) {
    grid.innerHTML = `<p class="col-span-full text-center text-red-700">Couldn't load products: ${err.message}</p>`;
  }
}

async function loadCategories() {
  try {
    const { categories } = await api("/products/categories");
    const container = document.getElementById("categoryFilters");
    categories.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "cat-btn px-4 py-2 rounded-full bg-white text-[var(--color-5)] text-sm font-medium border border-[var(--color-3)]";
      btn.dataset.category = c;
      btn.textContent = c;
      container.appendChild(btn);
    });
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-btn");
      if (!btn) return;
      container.querySelectorAll(".cat-btn").forEach((b) => {
        b.classList.remove("bg-[var(--color-5)]", "text-white");
        b.classList.add("bg-white", "text-[var(--color-5)]");
      });
      btn.classList.add("bg-[var(--color-5)]", "text-white");
      btn.classList.remove("bg-white");
      loadProducts(btn.dataset.category);
    });
  } catch (err) {
    /* non-fatal */
  }
}

function showProductDetails(id) {
  const p = ALL_PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("productTitle").textContent = p.title;
  document.getElementById("productPrice").textContent = money(p.price);
  document.getElementById("productDescription").textContent = p.description;
  document.getElementById("detailImage").src = p.image_url;
  document.getElementById("reviewCount").textContent = p.review_count;

  const featuresList = document.getElementById("productFeatures");
  featuresList.innerHTML = "";
  (p.features || []).forEach((f) => {
    const li = document.createElement("li");
    li.innerHTML = `<svg class="w-5 h-5 text-green-600 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>${f}`;
    featuresList.appendChild(li);
  });

  document.getElementById("modalQty").value = 1;
  document.getElementById("addToCartBtn").onclick = () => {
    const qty = Math.max(1, Math.min(10, parseInt(document.getElementById("modalQty").value, 10) || 1));
    Cart.add(p, qty);
    showToast(`Added ${qty} × ${p.title} to cart`);
    hideProductDetails();
  };

  document.getElementById("productModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideProductDetails() {
  document.getElementById("productModal").classList.remove("active");
  document.body.style.overflow = "auto";
}

function renderRecommendedStrip() {
  const shape = sessionStorage.getItem("ll_face_shape");
  if (!shape) return;
  const section = document.getElementById("recommended");
  const grid = document.getElementById("recommendedGrid");
  const matches = ALL_PRODUCTS.filter((p) => (p.face_shapes || []).includes(shape)).slice(0, 4);
  if (matches.length === 0) return;
  document.getElementById("recommendedShapeLabel").textContent = shape;
  grid.innerHTML = matches.map((p) => productCardHTML(p, { badge: "For you" })).join("");
  section.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();
  await loadCategories();
  renderRecommendedStrip();

  document.getElementById("productModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) hideProductDetails();
  });

  document.getElementById("mobile-menu-toggle")?.addEventListener("click", () => {
    document.getElementById("mobile-menu").classList.toggle("hidden");
  });
});
