// server/routes/sellers.js
//
// Seller registration + Stripe Connect onboarding. Hibretfamily never
// collects a seller's bank details or identity documents itself —
// Stripe's own hosted onboarding flow does that, and Hibretfamily only
// ever stores the resulting `stripe_account_id`. This is what makes
// "the platform never holds seller funds" true: money for a sale goes
// straight from the buyer's card to the seller's own Stripe balance
// (see routes/checkout.js), Hibretfamily only receives its commission.

const express = require('express');
const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// POST /api/sellers/register
// body: { businessName, email, agreedToLiabilityTerms }
//
// `tier` is deliberately NOT accepted here — it always starts as
// 'freemium'. It can only become 'subscription' once the webhook in
// webhooks.js sees a real paid Stripe subscription go active (see
// subscriptions.js); accepting a client-supplied tier at registration
// would let anyone register as 'subscription' and get the lower
// commission rate without ever paying for it.
router.post('/register', async (req, res) => {
  const { businessName, email, agreedToLiabilityTerms } = req.body;

  if (!businessName || !email) {
    return res.status(400).json({ error: 'businessName and email are required.' });
  }
  // Sellers — not Hibretfamily — are liable for what they list (see the
  // disclaimer shown alongside this form). No acknowledgment, no account.
  if (agreedToLiabilityTerms !== true) {
    return res.status(400).json({ error: 'You must accept the liability terms to register as a seller.' });
  }

  const { data: seller, error: insertError } = await supabase
    .from('sellers')
    .insert({
      business_name: businessName,
      email,
      tier: 'freemium',
      agreed_to_liability_terms: true,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('seller registration error:', insertError.message);
    return res.status(500).json({ error: 'Could not create your seller account.' });
  }

  let account;
  try {
    account = await stripe.accounts.create({
      type: 'express',
      email,
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  } catch (err) {
    console.error('stripe account creation failed:', err.message);
    return res.status(502).json({ error: 'Could not set up your payout account. Please try again.' });
  }

  const { error: updateError } = await supabase
    .from('sellers')
    .update({ stripe_account_id: account.id })
    .eq('id', seller.id);
  if (updateError) {
    console.error('failed to save stripe_account_id:', updateError.message);
  }

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${CLIENT_URL}/sell.html?onboarding=refresh&sellerId=${seller.id}`,
    return_url: `${CLIENT_URL}/sell.html?onboarding=complete&sellerId=${seller.id}`,
    type: 'account_onboarding',
  });

  res.status(201).json({
    sellerId: seller.id,
    // Shown to the seller exactly once, here — see the access_token
    // comment in supabase/schema.sql. dashboard.html reads it from the
    // URL; sell.js must show/save this link before sending them to
    // Stripe, since there is no way to recover it afterwards.
    accessToken: seller.access_token,
    onboardingUrl: accountLink.url,
  });
});

// GET /api/sellers/:id/status — lets the "Sell on Hibretfamily" page
// poll whether Stripe onboarding actually finished (charges_enabled),
// kept current by the account.updated webhook in routes/webhooks.js.
// Also surfaces the mNakfa manual-payout fields (see PATCH below) so
// the dashboard can show whether a payment method is set at all.
router.get('/:id/status', async (req, res) => {
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, business_name, tier, charges_enabled, subscription_status, mnakfa_number, mnakfa_holder_name, mnakfa_zoba, stripe_account_id')
    .eq('id', req.params.id)
    .single();

  if (error || !seller) {
    return res.status(404).json({ error: 'Seller not found.' });
  }

  // The webhook is the normal way this field gets kept current, but a
  // missed/misconfigured delivery shouldn't permanently strand a seller
  // whose Stripe account is actually enabled — so a still-false reading
  // gets double-checked directly against Stripe before being trusted.
  if (!seller.charges_enabled && seller.stripe_account_id) {
    try {
      const account = await stripe.accounts.retrieve(seller.stripe_account_id);
      if (account.charges_enabled) {
        await supabase.from('sellers').update({ charges_enabled: true }).eq('id', seller.id);
        seller.charges_enabled = true;
      }
    } catch (err) {
      console.error('live Stripe status check failed:', err.message);
    }
  }

  delete seller.stripe_account_id;
  res.json({ seller });
});

// Eritrea's 6 administrative zobas — not an ID document, just enough
// location context for support/disputes (see mnakfa_zoba in schema.sql).
// A fixed list, not free text, so it stays genuinely low-sensitivity and
// never becomes a place to paste something that wasn't asked for.
const VALID_ZOBAS = ['Maekel', 'Anseba', 'Gash-Barka', 'Debub', 'Semenawi Keyih Bahri', 'Debubawi Keyih Bahri'];

// PATCH /api/sellers/:id/payment-info
// body: { token, mnakfaNumber, mnakfaHolderName, mnakfaZoba }
//
// Lets a seller record a manual mNakfa payout contact — for sellers
// who can't get a Stripe-supported bank account (Stripe has no
// presence in Eritrea). This is a manual, non-Stripe path: a buyer
// pays this number directly and the seller confirms receipt
// themselves. Token-gated the same way as routes/seller-products.js.
router.patch('/:id/payment-info', async (req, res) => {
  const { token, mnakfaNumber, mnakfaHolderName, mnakfaZoba } = req.body;

  const { data: seller, error: lookupError } = await supabase
    .from('sellers')
    .select('id, access_token')
    .eq('id', req.params.id)
    .single();
  if (lookupError || !seller || seller.access_token !== token) {
    return res.status(401).json({ error: 'Invalid seller credentials.' });
  }

  if (!mnakfaNumber || !mnakfaHolderName || !mnakfaZoba) {
    return res.status(400).json({ error: 'mnakfaNumber, mnakfaHolderName, and mnakfaZoba are required.' });
  }
  if (!VALID_ZOBAS.includes(mnakfaZoba)) {
    return res.status(400).json({ error: `mnakfaZoba must be one of: ${VALID_ZOBAS.join(', ')}` });
  }

  const { data: updated, error } = await supabase
    .from('sellers')
    .update({ mnakfa_number: mnakfaNumber, mnakfa_holder_name: mnakfaHolderName, mnakfa_zoba: mnakfaZoba })
    .eq('id', seller.id)
    .select('id, mnakfa_number, mnakfa_holder_name, mnakfa_zoba')
    .single();

  if (error) {
    console.error('failed to save mNakfa payment info:', error.message);
    return res.status(500).json({ error: 'Could not save your payment details.' });
  }

  res.json({ seller: updated });
});

module.exports = router;
