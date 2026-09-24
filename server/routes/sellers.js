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

const VALID_TIERS = ['freemium', 'subscription'];

// POST /api/sellers/register
// body: { businessName, email, tier, agreedToLiabilityTerms }
router.post('/register', async (req, res) => {
  const { businessName, email, tier = 'freemium', agreedToLiabilityTerms } = req.body;

  if (!businessName || !email) {
    return res.status(400).json({ error: 'businessName and email are required.' });
  }
  if (!VALID_TIERS.includes(tier)) {
    return res.status(400).json({ error: `tier must be one of: ${VALID_TIERS.join(', ')}` });
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
      tier,
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
router.get('/:id/status', async (req, res) => {
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, business_name, tier, charges_enabled, subscription_status')
    .eq('id', req.params.id)
    .single();

  if (error || !seller) {
    return res.status(404).json({ error: 'Seller not found.' });
  }

  res.json({ seller });
});

module.exports = router;
