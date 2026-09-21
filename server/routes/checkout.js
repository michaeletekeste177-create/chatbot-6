// server/routes/checkout.js
//
// This is the "secure payment backend" piece: the browser only ever
// sends product IDs + quantities. Prices are always re-read from
// Supabase on the server, so a tampered client-side price never
// reaches Stripe. A Stripe webhook then flips the order to "paid"
// once payment is actually confirmed — the frontend can't fake that.

const express = require('express');
const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// POST /api/checkout/create-session
// body: { items: [{ productId, quantity }], customerEmail? }
router.post('/create-session', async (req, res) => {
  const { items, customerEmail } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const productIds = items.map((i) => i.productId);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price_cents, currency, stock, image_url')
    .in('id', productIds)
    .eq('is_active', true);

  if (error) {
    console.error('checkout product lookup error:', error.message);
    return res.status(500).json({ error: 'Could not verify products.' });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let totalCents = 0;
  const lineItems = [];
  const orderItemRows = [];

  for (const { productId, quantity } of items) {
    const product = productMap.get(productId);
    const qty = Number(quantity) || 0;

    if (!product) {
      return res.status(400).json({ error: `Unknown product: ${productId}` });
    }
    if (qty < 1) {
      return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
    }
    if (product.stock < qty) {
      return res.status(400).json({ error: `${product.name} is out of stock.` });
    }

    totalCents += product.price_cents * qty;

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: product.currency || 'usd',
        unit_amount: product.price_cents,
        product_data: {
          name: product.name,
          images: product.image_url ? [product.image_url] : [],
        },
      },
    });

    orderItemRows.push({
      product_id: product.id,
      quantity: qty,
      unit_price_cents: product.price_cents,
    });
  }

  // Create a pending order first so we have an ID to reconcile against
  // when the Stripe webhook fires.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ status: 'pending', total_cents: totalCents })
    .select()
    .single();

  if (orderError) {
    console.error('order insert error:', orderError.message);
    return res.status(500).json({ error: 'Could not start checkout.' });
  }

  await supabase.from('order_items').insert(
    orderItemRows.map((row) => ({ ...row, order_id: order.id }))
  );

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: customerEmail || undefined,
    success_url: `${CLIENT_URL}/success.html?order=${order.id}`,
    cancel_url: `${CLIENT_URL}/cart.html?cancelled=1`,
    metadata: { order_id: order.id },
  });

  await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', order.id);

  res.json({ url: session.url });
});

// POST /api/checkout/webhook
// Stripe calls this directly — mount with express.raw() in server.js,
// NOT express.json(), or signature verification will fail.
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          stripe_payment_intent: session.payment_intent,
        })
        .eq('id', orderId);
    }
  }

  res.json({ received: true });
});

module.exports = router;
