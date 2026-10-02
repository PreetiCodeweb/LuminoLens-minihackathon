const STAGES = ["Placed", "Processing", "Shipped", "Out for Delivery", "Delivered"];

function progressHTML(status) {
  if (status === "Cancelled") {
    return `<p class="status-pill status-Cancelled">Cancelled</p>`;
  }
  const currentIdx = STAGES.indexOf(status);
  return `
    <div class="flex items-center w-full mt-4">
      ${STAGES.map((stage, i) => {
        const done = i <= currentIdx;
        return `
          <div class="flex-1 flex flex-col items-center relative">
            ${i > 0 ? `<div class="absolute top-2 right-1/2 w-full h-0.5 ${i <= currentIdx ? "bg-[var(--color-3)]" : "bg-gray-300"}" style="z-index:0;"></div>` : ""}
            <div class="w-4 h-4 rounded-full ${done ? "bg-[var(--color-3)]" : "bg-gray-300"} z-10"></div>
            <span class="text-[10px] mt-1 text-center ${done ? "text-[var(--color-4)] font-semibold" : "text-gray-400"}">${stage}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function orderCardHTML(order) {
  return `
    <div class="bg-white rounded-xl shadow p-6">
      <div class="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div>
          <p class="font-semibold text-lg">Order #${order.id}</p>
          <p class="text-xs text-[var(--color-4)]">Placed ${new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <span class="status-pill ${statusClass(order.status)}">${order.status}</span>
      </div>

      <div class="divide-y">
        ${order.items
          .map(
            (it) => `
          <div class="py-2 flex justify-between text-sm">
            <span>${it.title} × ${it.quantity}</span>
            <span>${money(it.price * it.quantity)}</span>
          </div>`
          )
          .join("")}
      </div>

      <div class="flex justify-between font-bold mt-3 pt-3 border-t">
        <span>Total</span><span>${money(order.total)}</span>
      </div>

      <p class="text-xs text-[var(--color-4)] mt-2">
        Delivering to ${order.shipping_address}, ${order.shipping_city}
        ${order.estimated_delivery ? ` · Est. delivery ${order.estimated_delivery}` : ""}
      </p>

      ${progressHTML(order.status)}
    </div>
  `;
}

async function loadOrders() {
  if (!requireLoginOrRedirect("orders.html")) return;
  try {
    const { orders } = await api("/orders", { auth: true });
    const list = document.getElementById("ordersList");
    const empty = document.getElementById("noOrders");
    if (orders.length === 0) {
      empty.classList.remove("hidden");
      return;
    }
    list.innerHTML = orders.map(orderCardHTML).join("");
  } catch (err) {
    showToast(err.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", loadOrders);
