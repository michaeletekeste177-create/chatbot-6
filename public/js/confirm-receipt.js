// public/js/confirm-receipt.js
//
// Reads ?order=<id>&token=<delivery_confirmation_token> from the SMS
// link a seller's "mark as shipped" action sends (see
// server/routes/seller-orders.js). Tapping the button is the buyer's
// only "login" — the token itself is the authorization, the same
// unguessable-UUID model success.js's receipt fetch uses.

import { API_BASE } from './config.js';

function init() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  const token = params.get('token');
  const summaryEl = document.getElementById('confirm-summary');
  const btn = document.getElementById('confirm-receipt-btn');
  const doneEl = document.getElementById('confirm-done');

  if (!orderId || !token) {
    summaryEl.textContent = 'This link is missing information — please use the exact link from your SMS/WhatsApp message.';
    return;
  }

  summaryEl.textContent = 'Tap below once your order has arrived.';
  btn.hidden = false;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/confirm-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error('Could not confirm receipt.');

      btn.hidden = true;
      summaryEl.hidden = true;
      doneEl.hidden = false;
    } catch (err) {
      summaryEl.textContent = err.message || 'Something went wrong — please try again.';
      btn.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
