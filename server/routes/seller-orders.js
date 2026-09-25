// server/routes/seller-orders.js
//
// Read-only view of a seller's own orders — the minimal thing a seller
// needs to actually fulfill a sale (what sold, to whom, and any
// requested delivery date/note), gated the same way as
// seller-products.js: the access_token shown once at registration.
// Never exposes commission_cents or another seller's orders.

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

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
      'id, status, subtotal_cents, currency, buyer_email, requested_delivery_at, delivery_note, created_at, order_items(quantity, unit_price_cents, products(name))'
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
      createdAt: order.created_at,
      items: (order.order_items || []).map((item) => ({
        name: item.products?.name || 'Item',
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
      })),
    })),
  });
});

module.exports = router;
