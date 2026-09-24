// server/routes/subscriptions.js
//
// The "large merchant" premium tier: a recurring platform fee in
// exchange for a lower commission rate on every sale (see
// COMMISSION_PERCENT_SUBSCRIPTION in routes/checkout.js). This creates
// a normal Stripe Checkout subscription session against Hibretfamily's
// own account — a seller's subscription payment IS platform revenue,
// unlike a sale, which is why it does NOT go through Connect/transfer_data.
// The seller's `tier` only flips once the subscription actually
// activates, via the webhook in routes/webhooks.js — never optimistically
// here, since the client can't be trusted to report its own payment result.

const express = require('express');
const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// POST /api/subscriptions/create-checkout-session
// body: { sellerId }
router.post('/create-checkout-session', async (req, res) => {
  const { sellerId } = req.body;

  if (!sellerId) {
    return res.status(400).json({ error: 'sellerId is required.' });
  }
  if (!process.env.STRIPE_PREMIUM_PRICE_ID) {
    console.error('subscriptions: STRIPE_PREMIUM_PRICE_ID is not configured');
    return res.status(500).json({ error: 'The premium plan is not configured yet. Contact support.' });
  }

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, email, tier, subscription_status')
    .eq('id', sellerId)
    .single();

  if (error || !seller) {
    return res.status(404).json({ error: 'Seller not found.' });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: seller.email,
      line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
      success_url: `${CLIENT_URL}/sell.html?subscription=complete&sellerId=${seller.id}`,
      cancel_url: `${CLIENT_URL}/sell.html?subscription=cancelled&sellerId=${seller.id}`,
      metadata: { seller_id: seller.id },
    });
  } catch (err) {
    console.error('stripe subscription session creation failed:', err.message);
    return res.status(502).json({ error: 'Could not start the subscription checkout.' });
  }

  res.json({ url: session.url });
});

module.exports = router;
