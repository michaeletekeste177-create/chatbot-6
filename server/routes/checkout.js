// server/routes/checkout.js
//
// The actual "instant split-payment gateway": one Stripe Checkout
// Session, created as a destination charge — `transfer_data.destination`
// sends the sale straight to the seller's own connected Stripe account,
// `application_fee_amount` is the only slice Hibretfamily's platform
// account ever receives. Hibretfamily's account never holds the
// buyer's money even momentarily; there is no wallet to reconcile.
//
// A Stripe destination charge has exactly one destination account, so
// a checkout is always for ONE seller's products. The cart on the
// frontend enforces this too (public/js/cart.js), but it's re-checked
// here since the server can't trust the client.

const express = require('express');
const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// Commission rates are a placeholder pending a real business decision —
// set these from your actual pricing before launch. The subscription
// tier's lower rate is the incentive for a merchant to pay the
// recurring fee (see routes/subscriptions.js).
const COMMISSION_PERCENT_FREEMIUM = Number(process.env.PLATFORM_COMMISSION_PERCENT || 12);
const COMMISSION_PERCENT_SUBSCRIPTION = Number(process.env.PLATFORM_COMMISSION_PERCENT_PREMIUM || 6);

function commissionRateFor(seller) {
  return seller.tier === 'subscription' ? COMMISSION_PERCENT_SUBSCRIPTION : COMMISSION_PERCENT_FREEMIUM;
}

// A buyer's preferred delivery time is a request, not a promise — kept
// loose (no slot system, no availability check) since delivery itself
// happens off-platform (see requested_delivery_at's comment in
// schema.sql). Only basic sanity checks apply: it must parse as a real
// date, and the note can't be unbounded.
const MAX_DELIVERY_NOTE_LENGTH = 500;

function parseRequestedDeliveryAt(value) {
  if (!value) return { requestedDeliveryAt: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: 'requestedDeliveryAt must be a valid date/time.' };
  }
  return { requestedDeliveryAt: date.toISOString() };
}

// POST /api/checkout/create-session
// body: { items: [{ productId, quantity }], customerEmail?, requestedDeliveryAt?, deliveryNote? }
router.post('/create-session', async (req, res) => {
  const { items, customerEmail, requestedDeliveryAt, deliveryNote } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const deliveryResult = parseRequestedDeliveryAt(requestedDeliveryAt);
  if (deliveryResult.error) {
    return res.status(400).json({ error: deliveryResult.error });
  }
  if (deliveryNote !== undefined && String(deliveryNote).length > MAX_DELIVERY_NOTE_LENGTH) {
    return res.status(400).json({ error: `deliveryNote must be ${MAX_DELIVERY_NOTE_LENGTH} characters or fewer.` });
  }

  const productIds = items.map((i) => i.productId);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, seller_id, price_cents, currency, stock, image_url')
    .in('id', productIds)
    .eq('is_active', true);

  if (error) {
    console.error('checkout product lookup error:', error.message);
    return res.status(500).json({ error: 'Could not verify products.' });
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const sellerIds = new Set(products.map((p) => p.seller_id));
  if (sellerIds.size > 1) {
    return res.status(400).json({
      error: 'A single checkout can only include products from one seller. Please check out sellers separately.',
    });
  }

  let totalCents = 0;
  let currency = null;
  const lineItems = [];
  const orderItemRows = [];

  for (const { productId, quantity } of items) {
    const product = productMap.get(productId);
    const qty = Number(quantity) || 0;

    if (!product) {
      return res.status(400).json({ error: `Unknown or inactive product: ${productId}` });
    }
    if (qty < 1) {
      return res.status(400).json({ error: `Invalid quantity for ${product.name}` });
    }
    if (product.stock < qty) {
      return res.status(400).json({ error: `${product.name} is out of stock.` });
    }
    currency = currency || product.currency;
    if (product.currency !== currency) {
      return res.status(400).json({ error: 'All items in a single checkout must use the same currency.' });
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

  const sellerId = [...sellerIds][0];
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, tier, stripe_account_id, charges_enabled')
    .eq('id', sellerId)
    .single();

  if (sellerError || !seller) {
    console.error('checkout seller lookup error:', sellerError?.message);
    return res.status(500).json({ error: 'Could not verify the seller for this order.' });
  }
  if (!seller.charges_enabled || !seller.stripe_account_id) {
    return res.status(400).json({ error: 'This seller has not finished payment setup yet.' });
  }

  const commissionCents = Math.round((totalCents * commissionRateFor(seller)) / 100);

  // Create a pending order first so we have an ID to reconcile against
  // when the Stripe webhook fires.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      seller_id: seller.id,
      buyer_email: customerEmail || null,
      status: 'pending',
      subtotal_cents: totalCents,
      commission_cents: commissionCents,
      currency,
      requested_delivery_at: deliveryResult.requestedDeliveryAt,
      delivery_note: deliveryNote ? String(deliveryNote).trim() || null : null,
    })
    .select()
    .single();

  if (orderError) {
    console.error('order insert error:', orderError.message);
    return res.status(500).json({ error: 'Could not start checkout.' });
  }

  await supabase.from('order_items').insert(
    orderItemRows.map((row) => ({ ...row, order_id: order.id }))
  );

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: customerEmail || undefined,
      payment_intent_data: {
        application_fee_amount: commissionCents,
        transfer_data: { destination: seller.stripe_account_id },
      },
      success_url: `${CLIENT_URL}/success.html?order=${order.id}`,
      cancel_url: `${CLIENT_URL}/index.html?cancelled=1`,
      metadata: { order_id: order.id },
    });
  } catch (err) {
    console.error('stripe checkout session creation failed:', err.message);
    return res.status(502).json({ error: 'Could not start checkout with our payment provider.' });
  }

  await supabase
    .from('orders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', order.id);

  res.json({ url: session.url });
});

module.exports = router;
