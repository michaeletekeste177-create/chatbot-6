// public/js/orders-lookup.js
//
// Simple buyer order history: looks up orders by the email typed in,
// no account or verification (see the comment on GET /api/orders in
// server/routes/orders.js for the accepted trade-off that comes with
// skipping verification).

import { API_BASE } from './config.js';
import { formatPrice } from './cart.js';

async function handleLookupSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const stateEl = document.getElementById('lookup-state');
  const listEl = document.getElementById('order-list');

  stateEl.hidden = false;
  stateEl.textContent = 'Looking up your orders…';
  listEl.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/orders?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Lookup failed');
    const { orders } = await res.json();

    if (!orders.length) {
      stateEl.textContent = 'No orders found for that email.';
      return;
    }

    stateEl.hidden = true;
    listEl.innerHTML = orders
      .map(
        (order) => `
      <div class="cart-item dashboard-product-row">
        <div class="cart-item__info">
          <strong>Order #${order.id.slice(0, 8)}</strong>
          <span class="cart-item__category">${new Date(order.createdAt).toLocaleDateString()} · ${order.status}</span>
        </div>
        <div class="cart-item__price">${formatPrice(order.totalCents, order.currency)}</div>
        <div class="cart-item__controls">
          <a class="btn btn--ghost btn--sm" href="success.html?order=${order.id}">View receipt</a>
        </div>
      </div>
    `
      )
      .join('');
  } catch (err) {
    stateEl.textContent =
      err instanceof TypeError
        ? 'Could not reach the Hibretfamily backend — connect it (see README) to look up real orders.'
        : err.message || 'Something went wrong. Please try again.';
  }
}

function init() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  document.getElementById('lookup-form')?.addEventListener('submit', handleLookupSubmit);
}

document.addEventListener('DOMContentLoaded', init);
