// server/routes/seller-orders.js
//
// Read-only view of a seller's own orders — the minimal thing a seller
// needs to actually fulfill a sale (what sold, to whom, and any
// requested delivery date/note), gated the same way as
// seller-products.js: the access_token shown once at registration.
// Never exposes commission_cents or another seller's orders.

const express = require('express');
const { supabase } = require('../config/supabase');
const { notifyBuyerOrderShipped } = require('../lib/notify');

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

async function verifySeller(sellerId, token) {
  if (!sellerId || !token) return null;
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, access_token')
    .eq('id', sellerId)
    .single();
  if (error || !seller || seller.access_token !== token) return null;
  return seller;
}

// GET /api/seller-orders?sellerId=&token=
router.get('/', async (req, res) => {
  const seller = await verifySeller(req.query.sellerId, req.query.token);
  if (!seller) return res.status(401).json({ error: 'Invalid seller credentials.' });

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, status, subtotal_cents, currency, buyer_email, requested_delivery_at, delivery_note, shipped_at, received_at, created_at, order_items(quantity, unit_price_cents, products(name))'
    )
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('seller-orders list error:', error.message);
    return res.status(500).json({ error: 'Could not load your orders.' });
  }

  res.json({
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalCents: order.subtotal_cents,
      currency: order.currency,
      buyerEmail: order.buyer_email,
      requestedDeliveryAt: order.requested_delivery_at,
      deliveryNote: order.delivery_note,
      shippedAt: order.shipped_at,
      receivedAt: order.received_at,
      createdAt: order.created_at,
      items: (order.order_items || []).map((item) => ({
        name: item.products?.name || 'Item',
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
      })),
    })),
  });
});

// PATCH /api/seller-orders/:id/ship
// body: { sellerId, token }
//
// The manual delivery-confirmation trigger for orders paid outside
// Stripe (mNakfa) — there's no webhook to mark anything automatically
// for that path, so the seller (or their in-Eritrea contact) marks it
// shipped themselves, which texts the buyer a confirm-receipt link
// (see server/lib/notify.js and public/confirm-receipt.html).
router.patch('/:id/ship', async (req, res) => {
  const { sellerId, token } = req.body;
  const seller = await verifySeller(sellerId, token);
  if (!seller) return res.status(401).json({ error: 'Invalid seller credentials.' });

  const { data: order, error } = await supabase
    .from('orders')
    .update({ shipped_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('seller_id', seller.id) // scoped: can't ship another seller's order by guessing an id
    .select('id, buyer_phone, subtotal_cents, currency, delivery_confirmation_token, shipped_at')
    .single();

  if (error || !order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const confirmUrl = `${CLIENT_URL}/confirm-receipt.html?order=${order.id}&token=${order.delivery_confirmation_token}`;
  await notifyBuyerOrderShipped(order, confirmUrl);

  res.json({ shippedAt: order.shipped_at });
});

module.exports = router;
