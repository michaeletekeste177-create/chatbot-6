// public/js/success.js
//
// Reads ?order=<id> from the Stripe success_url redirect and shows a
// receipt fetched from GET /api/orders/:id/receipt — a buyer-safe view
// (no commission or seller Stripe details) keyed only by the
// unguessable order id, the same trust model Stripe's own hosted
// checkout success page uses.

import { API_BASE } from './config.js';
import { formatPrice } from './cart.js';

function init() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const orderId = new URLSearchParams(window.location.search).get('order');
  const summaryEl = document.getElementById('success-summary');
  const itemsEl = document.getElementById('success-items');

  if (!orderId) {
    summaryEl.textContent = 'Thanks for your order!';
    return;
  }

  fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/receipt`)
    .then((res) => {
      if (!res.ok) throw new Error('receipt not found');
      return res.json();
    })
    .then(({ order }) => {
      summaryEl.textContent = `Order total: ${formatPrice(order.totalCents, order.currency)} — status: ${order.status}`;
      itemsEl.innerHTML = order.items
        .map(
          (item) => `
        <div class="cart-item">
          <div class="cart-item__info"><strong>${item.name}</strong></div>
          <span>× ${item.quantity}</span>
          <div class="cart-item__price">${formatPrice(item.unitPriceCents * item.quantity, order.currency)}</div>
        </div>
      `
        )
        .join('');
    })
    .catch(() => {
      summaryEl.textContent = 'Thanks for your order! (Connect the Hibretfamily backend to show a full receipt here.)';
    });
}

document.addEventListener('DOMContentLoaded', init);
