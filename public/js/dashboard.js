// public/js/dashboard.js
//
// The seller's product management page. There's no password login in
// this project yet (see supabase/schema.sql's access_token comment),
// so `?sellerId=<id>&token=<access_token>` in this page's own URL is
// the seller's only credential — every API call below sends it back
// to server/routes/seller-products.js, which checks it on every write.

import { API_BASE, CATEGORIES, AUDIENCES } from './config.js';
import { formatPrice } from './cart.js';
import { showToast } from './ui.js';

function getCreds() {
  const params = new URLSearchParams(window.location.search);
  return { sellerId: params.get('sellerId'), token: params.get('token') };
}

function centsToDollarsInput(cents) {
  return (cents / 100).toFixed(2);
}

function dollarsInputToCents(value) {
  return Math.round(Number(value) * 100);
}

function populateSelects(form) {
  const categorySelect = form.querySelector('select[name="category"]');
  const audienceSelect = form.querySelector('select[name="audience"]');
  categorySelect.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('');
  audienceSelect.innerHTML = AUDIENCES.map((a) => `<option value="${a.id}">${a.label}</option>`).join('');
}

function renderProducts(listEl, products, { sellerId, token }) {
  if (!products.length) {
    listEl.innerHTML = '<p class="state-message">No products yet — add your first one above.</p>';
    return;
  }
  listEl.innerHTML = products
    .map(
      (product) => `
    <div class="cart-item dashboard-product-row" data-id="${product.id}">
      <div class="cart-item__info">
        <strong>${product.name}</strong>
        <span class="cart-item__category">${product.category} · ${product.audience} · stock ${product.stock}${product.is_active ? '' : ' · inactive'}</span>
      </div>
      <div class="cart-item__price">${formatPrice(product.price_cents, product.currency)}</div>
      <div class="cart-item__controls">
        <button type="button" class="btn btn--ghost btn--sm" data-action="edit">Edit</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="toggle">${product.is_active ? 'Deactivate' : 'Reactivate'}</button>
      </div>
    </div>
  `
    )
    .join('');

  listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.dashboard-product-row');
      const product = products.find((p) => p.id === row.dataset.id);
      fillFormForEdit(product);
    });
  });
  listEl.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.dashboard-product-row');
      const product = products.find((p) => p.id === row.dataset.id);
      await toggleActive(product, { sellerId, token });
    });
  });
}

let currentProducts = [];

function fillFormForEdit(product) {
  const form = document.getElementById('product-form');
  form.productId.value = product.id;
  form.name.value = product.name;
  form.category.value = product.category;
  form.audience.value = product.audience;
  form.currency.value = product.currency || 'usd';
  form.price.value = centsToDollarsInput(product.price_cents);
  form.stock.value = product.stock;
  form.image_url.value = product.image_url || '';
  document.getElementById('product-form-submit').textContent = 'Save changes';
  document.getElementById('product-form-cancel').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  const form = document.getElementById('product-form');
  form.reset();
  form.productId.value = '';
  document.getElementById('product-form-submit').textContent = 'Add product';
  document.getElementById('product-form-cancel').hidden = true;
}

async function toggleActive(product, { sellerId, token }) {
  try {
    const res = await fetch(
      product.is_active
        ? `${API_BASE}/seller-products/${product.id}?sellerId=${encodeURIComponent(sellerId)}&token=${encodeURIComponent(token)}`
        : `${API_BASE}/seller-products/${product.id}`,
      product.is_active
        ? { method: 'DELETE' }
        : {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sellerId, token, is_active: true }),
          }
    );
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Update failed');
    showToast(product.is_active ? 'Product deactivated' : 'Product reactivated');
    await loadProducts({ sellerId, token });
  } catch (err) {
    showToast(err.message || 'Something went wrong');
  }
}

async function loadProducts({ sellerId, token }) {
  const listEl = document.getElementById('product-list');
  const res = await fetch(`${API_BASE}/seller-products?sellerId=${encodeURIComponent(sellerId)}&token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Could not load your products.');
  const { products } = await res.json();
  currentProducts = products;
  renderProducts(listEl, products, { sellerId, token });
}

async function handleProductSubmit(e, { sellerId, token }) {
  e.preventDefault();
  const form = e.target;
  const stateEl = document.getElementById('product-form-state');
  const submitBtn = document.getElementById('product-form-submit');
  const productId = form.productId.value;

  const payload = {
    sellerId,
    token,
    name: form.name.value.trim(),
    category: form.category.value,
    audience: form.audience.value,
    currency: form.currency.value,
    price_cents: dollarsInputToCents(form.price.value),
    stock: Number(form.stock.value),
    image_url: form.image_url.value.trim() || null,
  };

  submitBtn.disabled = true;
  stateEl.hidden = false;
  stateEl.textContent = productId ? 'Saving changes…' : 'Adding product…';

  try {
    const res = await fetch(
      productId ? `${API_BASE}/seller-products/${productId}` : `${API_BASE}/seller-products`,
      {
        method: productId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Could not save the product.');

    stateEl.hidden = true;
    showToast(productId ? 'Product updated' : 'Product added');
    resetForm();
    await loadProducts({ sellerId, token });
  } catch (err) {
    stateEl.textContent = err.message || 'Something went wrong. Please try again.';
  } finally {
    submitBtn.disabled = false;
  }
}

// Reflects whether the seller has any real way to get paid yet
// (Stripe charges_enabled, or a manual mNakfa contact — see the
// payment-method gate in server/routes/seller-products.js) and
// shows/hides the product form accordingly.
function renderPaymentStatus(seller) {
  const statusEl = document.getElementById('payment-status');
  const noPaymentNotice = document.getElementById('no-payment-notice');
  const productForm = document.getElementById('product-form');
  const hasPaymentMethod = Boolean(seller.charges_enabled || seller.mnakfa_number);

  const lines = [];
  lines.push(
    `<p><strong>Stripe:</strong> ${seller.charges_enabled ? 'Connected ✓' : 'Not connected — finish onboarding on sell.html'}</p>`
  );
  lines.push(
    `<p><strong>mNakfa:</strong> ${
      seller.mnakfa_number ? `${seller.mnakfa_number} (${seller.mnakfa_holder_name || 'no name on file'}) ✓` : 'Not set'
    }</p>`
  );
  statusEl.innerHTML = `<div><h3>Your payment methods</h3>${lines.join('')}</div>`;

  noPaymentNotice.hidden = hasPaymentMethod;
  productForm.hidden = !hasPaymentMethod;

  const mnakfaForm = document.getElementById('mnakfa-form');
  if (seller.mnakfa_number) mnakfaForm.mnakfaNumber.value = seller.mnakfa_number;
  if (seller.mnakfa_holder_name) mnakfaForm.mnakfaHolderName.value = seller.mnakfa_holder_name;
}

async function handleMnakfaSubmit(e, { sellerId, token }) {
  e.preventDefault();
  const form = e.target;
  const stateEl = document.getElementById('mnakfa-form-state');
  const submitBtn = form.querySelector('button[type="submit"]');

  const mnakfaNumber = form.mnakfaNumber.value.trim();
  const mnakfaHolderName = form.mnakfaHolderName.value.trim();

  submitBtn.disabled = true;
  stateEl.hidden = false;
  stateEl.textContent = 'Saving…';

  try {
    const res = await fetch(`${API_BASE}/sellers/${encodeURIComponent(sellerId)}/payment-info`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mnakfaNumber, mnakfaHolderName }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Could not save your payment details.');

    stateEl.hidden = true;
    showToast('mNakfa details saved');
    const statusRes = await fetch(`${API_BASE}/sellers/${encodeURIComponent(sellerId)}/status`);
    const { seller } = await statusRes.json();
    renderPaymentStatus(seller);
  } catch (err) {
    stateEl.textContent = err.message || 'Something went wrong. Please try again.';
  } finally {
    submitBtn.disabled = false;
  }
}

function renderOrders(listEl, orders) {
  if (!orders.length) {
    listEl.innerHTML = '<p class="state-message">No orders yet.</p>';
    return;
  }
  listEl.innerHTML = orders
    .map((order) => {
      const itemsSummary = order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ');
      const delivery = order.requestedDeliveryAt
        ? `<span class="cart-item__category">Requested delivery: ${new Date(order.requestedDeliveryAt).toLocaleString()}</span>`
        : '';
      const note = order.deliveryNote
        ? `<span class="cart-item__category">Note: ${order.deliveryNote}</span>`
        : '';
      return `
    <div class="cart-item dashboard-product-row">
      <div class="cart-item__info">
        <strong>${itemsSummary || 'Order'}</strong>
        <span class="cart-item__category">Status: ${order.status}${order.buyerEmail ? ` · ${order.buyerEmail}` : ''}</span>
        ${delivery}
        ${note}
      </div>
      <div class="cart-item__price">${formatPrice(order.totalCents, order.currency)}</div>
    </div>
  `;
    })
    .join('');
}

async function loadOrders({ sellerId, token }) {
  const listEl = document.getElementById('order-list');
  const res = await fetch(`${API_BASE}/seller-orders?sellerId=${encodeURIComponent(sellerId)}&token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Could not load your orders.');
  const { orders } = await res.json();
  renderOrders(listEl, orders);
}

async function init() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const { sellerId, token } = getCreds();
  const statusMessage = document.getElementById('dashboard-status-message');
  const linkBox = document.getElementById('dashboard-link-box');
  const content = document.getElementById('dashboard-content');

  if (!sellerId || !token) {
    statusMessage.textContent =
      "This page needs the dashboard link you were shown when you registered — the one with ?sellerId= and &token= in the address. Lost it? There's no self-serve recovery yet; contact michaeletekeste177@gmail.com.";
    return;
  }

  linkBox.hidden = false;
  document.getElementById('dashboard-link-text').textContent = window.location.href;
  document.getElementById('copy-dashboard-link').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied');
    } catch {
      showToast('Could not copy — select and copy the link manually.');
    }
  });

  const form = document.getElementById('product-form');
  populateSelects(form);
  form.addEventListener('submit', (e) => handleProductSubmit(e, { sellerId, token }));
  document.getElementById('product-form-cancel').addEventListener('click', resetForm);
  document.getElementById('mnakfa-form').addEventListener('submit', (e) => handleMnakfaSubmit(e, { sellerId, token }));

  try {
    const statusRes = await fetch(`${API_BASE}/sellers/${encodeURIComponent(sellerId)}/status`);
    if (!statusRes.ok) throw new Error('not found');
    const { seller } = await statusRes.json();
    document.getElementById('dashboard-heading').textContent = `Welcome back, ${seller.business_name}`;
    statusMessage.textContent = seller.charges_enabled
      ? 'Payouts are enabled — products you add below can be purchased right away.'
      : 'Stripe onboarding is still incomplete, so your products will show in the catalog but cannot be checked out yet. Return to sell.html to finish onboarding.';

    content.hidden = false;
    renderPaymentStatus(seller);
    await loadProducts({ sellerId, token });
    await loadOrders({ sellerId, token });
  } catch (err) {
    statusMessage.textContent = 'Could not reach the Hibretfamily backend, or this link is invalid — connect the backend (see README) and confirm your sellerId/token.';
  }
}

document.addEventListener('DOMContentLoaded', init);
