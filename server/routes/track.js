// server/routes/track.js
//
// Hibretfamily is an affiliate storefront: it never sells anything
// itself, it only refers shoppers to an external store. This is that
// referral. The frontend never links directly to a product's real
// affiliate URL — every "Shop Now / ሕጂ ዓድግ" button points here instead,
// so every outbound click is logged (for commission reconciliation
// against the affiliate network's own reports) before the shopper is
// redirected onward. A plain <a href> to this route works even with
// JavaScript disabled, since the redirect happens server-side.

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/track-click?productId=<uuid>
router.get('/', async (req, res) => {
  const { productId } = req.query;

  if (!productId || !UUID_RE.test(productId)) {
    return res.status(400).json({ error: 'Missing or invalid productId.' });
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('id, affiliate_url')
    .eq('id', productId)
    .single();

  // PGRST116 is PostgREST's "no rows" code for .single() — a genuine
  // 404. Anything else (network blip, bad credentials, RLS misconfig)
  // is our problem, not the shopper's, so it's a 500, not a 404.
  if (error && error.code !== 'PGRST116') {
    console.error('track-click: product lookup error:', error.message);
    return res.status(500).json({ error: 'Could not process this click.' });
  }
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  let destination;
  try {
    destination = new URL(product.affiliate_url);
    if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }
  } catch {
    console.error(`track-click: product ${product.id} has an invalid affiliate_url`);
    return res.status(502).json({ error: 'This product’s store link is misconfigured.' });
  }

  // Log the click before redirecting, so a shopper who abandons the
  // destination page still counts for reconciliation purposes. Never
  // let a logging failure block the redirect the shopper is waiting on.
  const { error: logError } = await supabase.from('click_events').insert({
    product_id: product.id,
    affiliate_url: destination.toString(),
    referrer: req.get('Referer') || null,
    user_agent: req.get('User-Agent') || null,
  });
  if (logError) {
    console.error('track-click: failed to log click event:', logError.message);
  }

  res.redirect(302, destination.toString());
});

module.exports = router;
