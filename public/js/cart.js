function cartItemHTML(item) {
  return `
    <div class="bg-white rounded-lg shadow p-4 flex gap-4 items-center" data-id="${item.productId}">
      <img src="${item.image}" class="w-20 h-20 object-cover rounded-md" onerror="this.style.display='none';" />
      <div class="flex-1">
        <h3 class="font-semibold">${item.title}</h3>
        <p class="text-[var(--color-3)] font-bold">${money(item.price)}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="qty-btn px-2 py-1 border rounded" data-action="dec">-</button>
        <span class="w-6 text-center">${item.quantity}</span>
        <button class="qty-btn px-2 py-1 border rounded" data-action="inc">+</button>
      </div>
      <p class="w-20 text-right font-semibold">${money(item.price * item.quantity)}</p>
      <button class="text-red-700 text-sm" data-action="remove">Remove</button>
    </div>
  `;
}

function renderCart() {
  const items = Cart.get();
  const container = document.getElementById("cartItems");
  const empty = document.getElementById("emptyCart");
  const form = document.getElementById("checkoutForm").closest(".sticky");

  if (items.length === 0) {
    container.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    container.innerHTML = items.map(cartItemHTML).join("");
  }

  const subtotal = Cart.subtotal();
  const shipping = items.length === 0 ? 0 : subtotal >= 100 ? 0 : 7.99;
  document.getElementById("sumSubtotal").textContent = money(subtotal);
  document.getElementById("sumShipping").textContent = shipping === 0 ? "FREE" : money(shipping);
  document.getElementById("sumTotal").textContent = money(subtotal + shipping);
  document.getElementById("placeOrderBtn").disabled = items.length === 0;
}

document.getElementById("cartItems").addEventListener("click", (e) => {
  const row = e.target.closest("[data-id]");
  if (!row) return;
  const id = parseInt(row.dataset.id, 10);
  const action = e.target.dataset.action;
  const items = Cart.get();
  const item = items.find((i) => i.productId === id);
  if (!item) return;

  if (action === "inc") Cart.updateQty(id, item.quantity + 1);
  if (action === "dec") Cart.updateQty(id, item.quantity - 1);
  if (action === "remove") Cart.remove(id);
  renderCart();
});

document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requireLoginOrRedirect("cart.html")) return;

  const items = Cart.get();
  if (items.length === 0) return;

  const shipping = {
    name: document.getElementById("shipName").value.trim(),
    address: document.getElementById("shipAddress").value.trim(),
    city: document.getElementById("shipCity").value.trim(),
    state: document.getElementById("shipState").value.trim(),
    zip: document.getElementById("shipZip").value.trim(),
    phone: document.getElementById("shipPhone").value.trim(),
    paymentMethod: document.getElementById("paymentMethod").value,
  };

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true;
  btn.textContent = "Placing order…";

  try {
    const { order } = await api("/orders", {
      method: "POST",
      auth: true,
      body: {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shipping,
        faceShape: sessionStorage.getItem("ll_face_shape") || null,
      },
    });
    Cart.clear();
    showToast(`Order #${order.id} placed! Estimated delivery ${order.estimated_delivery}.`);
    setTimeout(() => (window.location.href = "orders.html"), 800);
  } catch (err) {
    showToast(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Place Order";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Prefill name from account if logged in
  const user = Auth.getUser();
  if (user) document.getElementById("shipName").value = user.name;
  renderCart();
});
