// public/js/sell.js
//
// The "Sell With Us" page: plan comparison, the seller liability
// disclaimer (shown in both languages at once — not toggled, since
// it's a term a seller is agreeing to), the registration form, and
// (on return from Stripe) an onboarding-status check.

import { API_BASE, SELLER_TIERS, SELLER_LIABILITY_STATEMENT } from './config.js';
import { t, initLanguageToggle } from './i18n.js';
import { showToast, initScrollReveal, initHeaderScroll } from './ui.js';

function renderTiers() {
  const container = document.getElementById('tier-grid');
  if (!container) return;
  container.innerHTML = SELLER_TIERS.map(
    (tier) => `
    <div class="tier-card tier-card--${tier.id}" data-reveal>
      <h3>${t(tier.nameKey)}</h3>
      <p class="tier-card__target">${t(tier.targetKey)}</p>
      <p class="tier-card__price">${t(tier.priceKey)}</p>
    </div>
  `
  ).join('');
}

function renderLiabilityStatement() {
  const tiEl = document.querySelector('.liability-notice__ti');
  const enEl = document.querySelector('.liability-notice__en');
  if (tiEl) tiEl.textContent = SELLER_LIABILITY_STATEMENT.ti;
  if (enEl) enEl.textContent = SELLER_LIABILITY_STATEMENT.en;
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const stateEl = document.getElementById('seller-form-state');
  const submitBtn = form.querySelector('button[type="submit"]');

  const businessName = form.businessName.value.trim();
  const email = form.email.value.trim();
  const tier = form.tier.value;
  const agreedToLiabilityTerms = form.agreedToLiabilityTerms.checked;

  if (!agreedToLiabilityTerms) {
    stateEl.hidden = false;
    stateEl.textContent = 'You must accept the liability terms to continue.';
    return;
  }

  submitBtn.disabled = true;
  stateEl.hidden = false;
  stateEl.textContent = 'Setting up your seller account…';

  try {
    const res = await fetch(`${API_BASE}/sellers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, email, tier, agreedToLiabilityTerms }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Registration failed');

    showDashboardLink(body, stateEl, form, submitBtn);
  } catch (err) {
    console.error(err);
    stateEl.textContent =
      err instanceof TypeError
        ? 'Could not reach the Hibretfamily backend — connect it (see README) to enable real seller registration.'
        : err.message || 'Something went wrong. Please try again.';
    submitBtn.disabled = false;
  }
}

// Shown right after registration, before the seller ever leaves for
// Stripe: dashboard.html's URL (with the one-time access_token baked
// in) is the seller's only way back to manage their products, and
// there's no way to recover it once they navigate away — see the
// access_token comment in supabase/schema.sql.
function showDashboardLink(body, stateEl, form) {
  const dashboardUrl = new URL(
    `dashboard.html?sellerId=${encodeURIComponent(body.sellerId)}&token=${encodeURIComponent(body.accessToken)}`,
    window.location.href
  ).toString();

  form.hidden = true;
  stateEl.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'liability-notice';
  panel.id = 'dashboard-link-panel';
  panel.innerHTML = `
    <svg class="icon"><use href="#icon-shield"></use></svg>
    <div>
      <h3>Save your dashboard link now</h3>
      <p>This is the only way back into your seller dashboard to add products — there is no password login yet. Bookmark or copy it before continuing to Stripe.</p>
      <p style="word-break: break-all;"><strong>${dashboardUrl}</strong></p>
      <div style="display:flex; gap: 0.75rem; margin-top: 0.75rem; flex-wrap: wrap;">
        <button type="button" class="btn btn--ghost" id="copy-dashboard-link-sell">Copy link</button>
        <a class="btn btn--accent" href="${body.onboardingUrl}">Continue to Stripe onboarding</a>
      </div>
    </div>
  `;
  form.parentElement.appendChild(panel);

  panel.querySelector('#copy-dashboard-link-sell')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(dashboardUrl);
      showToast('Link copied');
    } catch {
      showToast('Could not copy — select and copy the link manually.');
    }
  });
}

async function checkOnboardingStatusFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const sellerId = params.get('sellerId');
  const onboarding = params.get('onboarding');
  const subscription = params.get('subscription');
  if (!sellerId || (!onboarding && !subscription)) return;

  const section = document.getElementById('onboarding-status');
  const message = document.getElementById('onboarding-status-message');
  section.hidden = false;

  if (subscription === 'complete') {
    message.textContent = 'Thanks! Your premium subscription is being activated.';
    showToast('Subscription checkout complete');
  }
  if (subscription === 'cancelled') {
    message.textContent = 'Subscription checkout was cancelled — you can try again anytime.';
  }

  if (onboarding) {
    try {
      const res = await fetch(`${API_BASE}/sellers/${encodeURIComponent(sellerId)}/status`);
      if (!res.ok) throw new Error('Could not check status');
      const { seller } = await res.json();
      message.textContent = seller.charges_enabled
        ? `You're all set, ${seller.business_name}! Payouts are enabled and you can start listing products.`
        : `Almost there, ${seller.business_name} — Stripe still needs a bit more information before payouts can start. Check your email from Stripe, or return to complete onboarding.`;
    } catch (err) {
      message.textContent = 'Could not check your onboarding status right now — connect the Hibretfamily backend (see README) to enable this.';
    }
  }
}

function init() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initLanguageToggle();
  initHeaderScroll();
  renderTiers();
  renderLiabilityStatement();
  checkOnboardingStatusFromQuery();
  initScrollReveal();

  document.getElementById('seller-form')?.addEventListener('submit', handleRegisterSubmit);

  document.addEventListener('languagechange', renderTiers);
}

document.addEventListener('DOMContentLoaded', init);
