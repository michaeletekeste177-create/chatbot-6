// server/routes/orders.js
//
// Refund handling. `refund_application_fee: false` is passed
// explicitly (it's already Stripe's default) to make the policy
// visible in code, not just implicit: a refund is paid out of the
// SELLER's own Stripe balance — the charge lives on their connected
// account — and Hibretfamily's commission is never clawed back.
//
// ⚠️ SECURITY GAP, INTENTIONALLY LEFT OPEN FOR NOW: this route has no
// authentication or authorization check at all. There is no admin
// login system yet in this project. Do NOT expose this route publicly
// or wire a frontend button to it until it sits behind real admin
// auth — for now, treat it as an internal-only tool called directly
// (e.g. via curl with the server's own network access), never from
// the public storefront.

const express = require('express');
const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
router.post('/:id/refund', async (req, res) => {
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
