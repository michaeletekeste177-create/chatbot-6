// server/routes/webhooks.js
//
// Stripe is the only source of truth for "did the money actually
// move" — the browser is never trusted to report its own payment
// result. Mounted with express.raw() in server.js (NOT express.json()),
// since Stripe's signature verification needs the exact raw request body.

const express = require('express');
const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/webhooks/stripe
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChanged(event.data.object);
        break;
      default:
        break; // not every event type is interesting to us
    }
  } catch (err) {
    // Stripe retries on non-2xx, so log and still ack receipt rather
    // than risk an infinite retry loop over a transient DB error.
    console.error(`webhook handler error for ${event.type}:`, err.message);
  }

  res.json({ received: true });
});

async function handleCheckoutCompleted(session) {
  if (session.mode === 'payment') {
    const orderId = session.metadata?.order_id;
    if (!orderId) return;
    await supabase
      .from('orders')
      .update({ status: 'paid', stripe_payment_intent_id: session.payment_intent })
      .eq('id', orderId);
    return;
  }

  if (session.mode === 'subscription') {
    const sellerId = session.metadata?.seller_id;
    if (!sellerId) return;
    await supabase
      .from('sellers')
      .update({
        tier: 'subscription',
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
      })
      .eq('id', sellerId);
  }
}

async function handleAccountUpdated(account) {
  await supabase
    .from('sellers')
    .update({ charges_enabled: !!account.charges_enabled })
    .eq('stripe_account_id', account.id);
}

async function handleDisputeCreated(charge) {
  if (!charge.payment_intent) return;
  await supabase
    .from('orders')
    .update({ status: 'disputed' })
    .eq('stripe_payment_intent_id', charge.payment_intent);
}

async function handleSubscriptionChanged(subscription) {
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  await supabase
    .from('sellers')
    .update({
      subscription_status: subscription.status,
      tier: isActive ? 'subscription' : 'freemium',
    })
    .eq('stripe_subscription_id', subscription.id);
}

module.exports = router;
