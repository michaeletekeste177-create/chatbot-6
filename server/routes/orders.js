// server/routes/orders.js
//
// Refund handling. `refund_application_fee: false` is passed
// explicitly (it's already Stripe's default) to make the policy
// visible in code, not just implicit: a refund is paid out of the
// SELLER's own Stripe balance — the charge lives on their connected
// account — and Hibretfamily's commission is never clawed back.
//
// The refund route requires an admin API key (see requireAdmin below).
// There's still no full admin login system in this project — this is a
// single shared secret, good enough to keep the route off the public
// internet, not a substitute for per-admin accounts/roles. Nothing in
// the frontend calls this; it's meant to be used directly (curl,
// Postman, an internal tool) by whoever holds ADMIN_API_KEY.

const express = require('express');
const crypto = require('crypto');
const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Shared-secret gate for admin-only routes. Compared with a fixed-length
// check (timingSafeEqual) so response timing can't be used to guess the
// key one byte at a time.
function requireAdmin(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    console.error('ADMIN_API_KEY is not set — refusing admin request.');
    return res.status(503).json({ error: 'Admin routes are not configured on this server.' });
  }
  const providedKey = req.get('x-admin-api-key') || '';
  const configured = Buffer.from(configuredKey);
  const provided = Buffer.from(providedKey);
  const isValid =
    configured.length === provided.length && crypto.timingSafeEqual(configured, provided);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or missing admin API key.' });
  }
  next();
}

// GET /api/orders/:id/receipt
//
// Public by design, but deliberately narrow: possessing the order's
// unguessable UUID (from the success_url Stripe redirects the buyer
// to) is the only "authorization" here, the same model Stripe's own
// hosted checkout success page uses. It returns only buyer-safe
// fields — never commission_cents or anything about the seller's
// Stripe account — so a buyer can see their own purchase confirmation
// without this becoming a way to read another seller's commission data.
router.get('/:id/receipt', async (req, res) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, subtotal_cents, currency, created_at, order_items(quantity, unit_price_cents, products(name))')
    .eq('id', req.params.id)
    .single();

  if (error || !order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  res.json({
    order: {
      id: order.id,
      status: order.status,
      totalCents: order.subtotal_cents,
      currency: order.currency,
      createdAt: order.created_at,
      items: (order.order_items || []).map((item) => ({
        name: item.products?.name || 'Item',
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
      })),
    },
  });
});

// POST /api/orders/:id/refund
// Requires header: x-admin-api-key: <ADMIN_API_KEY>
router.post('/:id/refund', requireAdmin, async (req, res) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, stripe_payment_intent_id')
    .eq('id', req.params.id)
    .single();

  if (error || !order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  if (order.status !== 'paid') {
    return res.status(400).json({ error: `Only paid orders can be refunded (current status: ${order.status}).` });
  }
  if (!order.stripe_payment_intent_id) {
    return res.status(400).json({ error: 'This order has no associated payment to refund.' });
  }

  let refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      refund_application_fee: false,
    });
  } catch (err) {
    console.error('refund creation failed:', err.message);
    return res.status(502).json({ error: 'Could not process the refund with our payment provider.' });
  }

  await supabase.from('orders').update({ status: 'refunded' }).eq('id', order.id);

  res.json({ refundId: refund.id, status: refund.status });
});

module.exports = router;
