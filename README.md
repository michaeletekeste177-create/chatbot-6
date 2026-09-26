# Hibretfamily

**Hibretfamily is a multi-vendor marketplace.** Independent sellers list and
price their own products (fashion for women/men/kids, shoes, electronics,
books, cosmetics); Hibretfamily takes a commission on each sale and never
holds a buyer's payment even momentarily. Every checkout is a single Stripe
Connect "destination charge" — the sale splits instantly between the
seller's own connected Stripe account and Hibretfamily's platform account.

```
public/            static frontend — no build step required
├── index.html         storefront: catalog, cart, checkout
├── sell.html           seller plans, liability terms, registration form
├── dashboard.html       seller's own product management (add/edit/deactivate)
├── success.html        post-checkout receipt ("የቐንየልና / Thank You")
├── orders.html          buyer order lookup by email (no account needed)
├── css/
│   ├── theme.css       ← EVERY color/font/spacing value. Edit this to re-theme.
│   └── style.css       component styles, reads theme.css tokens only
└── js/
    ├── config.js       site config, categories, store locations, seller tiers, demo data, i18n
    ├── cart.js          cart state (localStorage) — single-seller-at-a-time
    ├── catalog.js       fetches products from the backend, with demo fallback
    ├── i18n.js          English / Eritrean Tigrinya toggle
    ├── ui.js            nav, drawers, modal, sliders, toasts (generic DOM helpers)
    ├── main.js          storefront logic (index.html)
    ├── sell.js           seller registration page logic (sell.html)
    ├── dashboard.js       seller product CRUD logic (dashboard.html)
    ├── success.js        receipt page logic (success.html)
    ├── orders-lookup.js   order-by-email lookup logic (orders.html)
    └── contact-widget.js  floating WhatsApp/email contact button, on every page

server/             Node.js/Express backend
├── config/supabase.js  Supabase client (service-role key, server-only)
├── lib/notify.js       order-confirmation SMS/WhatsApp via Twilio — optional
├── routes/
│   ├── products.js     GET /api/products — catalog, joined with seller name
│   ├── sellers.js       POST /api/sellers/register, GET /api/sellers/:id/status
│   ├── seller-products.js  CRUD for a seller's own listings, gated by their access_token
│   ├── seller-orders.js  GET /api/seller-orders — a seller's own sales, token-gated
│   ├── checkout.js      POST /api/checkout/create-session — the split-payment gateway
│   ├── subscriptions.js POST /api/subscriptions/create-checkout-session — premium tier billing
│   ├── webhooks.js       POST /api/webhooks/stripe — the source of truth for payment state
│   └── orders.js         GET /api/orders?email=, GET /api/orders/:id/receipt,
│                         POST /api/orders/:id/refund (admin-key gated)
└── server.js            app entry point

supabase/schema.sql  sellers, products, orders (with requested delivery date/note),
                      order_items, decrement_product_stock() + RLS
scripts/verify-env.sh  checks Node/npm are installed
marketing/           non-code assets (promotional video script, etc.)
```

## How the split payment actually works

A sale is a single Stripe Checkout Session created with:

```js
payment_intent_data: {
  application_fee_amount: commissionCents,       // Hibretfamily's cut
  transfer_data: { destination: seller.stripe_account_id }, // the rest, straight to the seller
}
```

Stripe splits the charge the instant it settles — Hibretfamily's own account
never holds the buyer's money, so there's no wallet, no holding period, and
no manual payout run. Because a Stripe destination charge has exactly one
payout destination, **a cart can only ever hold one seller's products at a
time** (`public/js/cart.js` enforces this client-side; `routes/checkout.js`
re-checks it server-side, since the client can't be trusted).

Commission rates (`PLATFORM_COMMISSION_PERCENT`, lower for the
`subscription` tier) and the premium plan's price (`STRIPE_PREMIUM_PRICE_ID`)
are **placeholders** in `.env.example` — set real values from your actual
business terms before launch.

## Frontend — running it on its own

The frontend is plain HTML/CSS/JS (ES modules, no build step, no
framework lock-in) and works standalone:

```bash
npx http-server public -p 8080
# open http://localhost:8080
```

If it can't reach the backend, `index.html` automatically shows a curated
**demo catalog** with two sample sellers (see `public/js/config.js` →
`DEMO_PRODUCTS`), so the site's cart, seller-switch guard, and quick-view all
work fully offline, with a banner noting it's demo data. `sell.html` and
`success.html` show a friendly inline message instead of crashing when the
backend isn't reachable.

## Backend — full setup

This needs a Stripe account with **Connect enabled**.

1. **Check your environment**
   ```bash
   bash scripts/verify-env.sh
   ```
2. **Create the Supabase schema** — paste `supabase/schema.sql` into the
   Supabase SQL editor (or `supabase db push`). This creates `sellers`,
   `products` (owned by a seller, with real price/stock), `orders` and
   `order_items`.
3. **Configure and run the backend**
   ```bash
   cd server
   cp .env.example .env
   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
   # STRIPE_WEBHOOK_SECRET, STRIPE_PREMIUM_PRICE_ID
   npm install
   npm run dev
   ```
   Backend runs at `http://localhost:4000`.
4. **Point the frontend at it** — set `window.HIBRETFAMILY_API_BASE` before
   `</body>` in `index.html`/`sell.html`/`success.html`, or edit `API_BASE`
   directly in `public/js/config.js`.
5. **Stripe webhook (local dev)**
   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```
6. **Onboard a seller** — go to `/sell.html`, register. Registration shows
   the seller their **dashboard link** (`/dashboard.html?sellerId=…&token=…`)
   before sending them on to Stripe's own onboarding flow — save/bookmark it,
   since there's no way to recover it afterwards (see below). Complete
   Stripe's onboarding; `sellers.charges_enabled` flips to true via the
   `account.updated` webhook once that's done — only then can that seller's
   products be checked out.
7. **Set `ADMIN_API_KEY`** — a long random secret (e.g. `openssl rand -hex 32`)
   required in the `x-admin-api-key` header to call `POST /api/orders/:id/refund`.

## Seller product management

`/dashboard.html` lets a seller add, edit, and deactivate their own product
listings, backed by `server/routes/seller-products.js`. There is no password
login system in this project yet, so the seller's `access_token` (a column
on `sellers`, generated at registration — see the comment in
`supabase/schema.sql`) baked into that URL **is** their credential: every
write to `/api/seller-products` checks it against the matching seller id,
and it's never included in any publicly-readable query. A seller who loses
their dashboard link has no self-serve recovery yet — see "What's
intentionally NOT built yet" below.

A seller cannot list a product at all until they have **some** real way to
get paid — `POST /api/seller-products` returns a bilingual (EN/TI) 403
otherwise. That's either Stripe (`charges_enabled`) or the manual mNakfa
contact described next.

## mNakfa — a manual path for sellers Stripe can't reach

Stripe has no presence in Eritrea at all, so a seller who only has an
Eritrean bank account can never finish Stripe onboarding. **mNakfa**
(Himbol Financial Services' mobile-money service, run over EriTel and
licensed by the Bank of Eritrea) is a real, separate way for such a seller
to get paid — but it has no public API to integrate with, so this is
deliberately a **manual, non-Stripe path**:

- A seller records an `mnakfa_number` + `mnakfa_holder_name` on their
  account via `PATCH /api/sellers/:id/payment-info` (token-gated, same
  pattern as `seller-products.js`) — the "Payment Settings" section of
  `dashboard.html`.
- Having *either* Stripe `charges_enabled` *or* an `mnakfa_number` set is
  enough to satisfy the "must have a payment method" gate above.
- There is **no checkout integration yet** — a buyer paying via mNakfa
  would send payment to that number directly, outside the site, and the
  seller confirms receipt themselves. Building an actual "Pay with
  mNakfa" button into checkout (with a pending-confirmation order state)
  is the natural next step once this manual version is proven out.
- **Hibretfamily deliberately never computes a Nakfa amount or exchange
  rate.** Eritrea's official USD/ERN rate and its real (parallel-market)
  rate differ enormously, and Nakfa isn't freely convertible under
  Eritrean foreign-exchange law — picking either rate for the platform to
  display would mean the platform itself setting an FX rate, which is a
  regulatory question no one asked it to take on. The buyer and seller
  agree the Nakfa amount directly, off-platform; Hibretfamily only ever
  shows real, freely-convertible currencies (see below).

## Multi-currency listings (USD / EUR)

A seller picks their listing currency — USD or EUR — per product (the
`currency` field on `products`, validated in `seller-products.js`). Stripe
settles in whichever the seller chose; the storefront, cart, and receipts
already format any ISO currency correctly via `Intl.NumberFormat`
(`public/js/cart.js`'s `formatPrice`), so no other frontend change was
needed. A single checkout still has to be one currency at a time (the
existing single-seller-per-cart rule already guarantees this in practice).

## Preferred delivery date/time

At checkout, a buyer can optionally pick a preferred delivery date/time and
add a short note (`public/index.html`'s cart drawer, wired up in
`public/js/main.js`'s `startCheckout()`). This is a **request the seller
coordinates around, not a guaranteed slot** — there's no delivery-logistics
or routing system in this project; sellers arrange the actual delivery
themselves (e.g. via Eritrea Post for domestic shipments). Both fields are
optional and stored on the order (`requested_delivery_at`, `delivery_note`
in `supabase/schema.sql`), validated in `server/routes/checkout.js`, shown
back to the buyer on their receipt (`success.html`/`success.js` and
`GET /api/orders/:id/receipt`), and shown to the seller in their dashboard's
new **Orders** section (`GET /api/seller-orders`, token-gated the same way
as `seller-products.js`) so they actually know what was requested.

## SMS & WhatsApp order notifications (optional)

Once Stripe confirms a payment, `server/lib/notify.js` can text the buyer a
short order-confirmation message — over SMS, WhatsApp, or both — using
[Twilio](https://www.twilio.com), which supports both channels through one
API. This is **entirely optional infrastructure**: with `TWILIO_ACCOUNT_SID` /
`TWILIO_AUTH_TOKEN` unset in `.env` (the default), nothing changes — checkout
and webhooks work exactly as before, just without sending a message.

To turn it on:

1. Create a Twilio account and buy a phone number for SMS
   (`TWILIO_SMS_FROM`). For WhatsApp, either use Twilio's sandbox number
   while testing or apply for your own WhatsApp-enabled sender
   (`TWILIO_WHATSAPP_FROM`) once you're ready to go live.
2. **WhatsApp has one extra requirement SMS doesn't**: a business can only
   message a customer *first* (rather than reply within 24 hours of the
   customer messaging in) using a **pre-approved message template** — this
   is a WhatsApp/Meta policy, not something Twilio or this code can skip.
   Register a template for the order-confirmation text in the Twilio
   Console before relying on WhatsApp delivery; SMS has no such
   requirement and works immediately.
3. Set the four `TWILIO_*` variables in `.env` (see `.env.example`) and
   restart the backend.

A buyer's phone number comes from Stripe Checkout's own hosted page —
`checkout.js` turns on `phone_number_collection`, so there's no extra field
on Hibretfamily's own cart drawer. It's optional for the buyer there too;
if they leave it blank (or Twilio isn't configured), `notifyBuyerOrderConfirmed`
just does nothing — a failed or skipped notification never blocks the sale
itself.

## WhatsApp Business (the contact button)

The floating contact button (`public/js/contact-widget.js`) already links to
`https://wa.me/<SITE.phone>` — that same link works identically whether
`SITE.phone` is a regular WhatsApp number or one registered with the
(free) **WhatsApp Business** app. Installing WhatsApp Business on that
number is a phone-side setup step, not a code change — it gets you a
business profile (hours, address, catalog), automated greeting/away
messages, and quick-reply templates. Once you've installed it on your
shop's number, update `SITE.phone` in `public/js/config.js` if that number
is different from the placeholder currently there.

## Order lookup and customer contact (the simple versions)

- **`/orders.html`** lets a buyer see their past orders by typing the email
  they checked out with — `GET /api/orders?email=` (`server/routes/orders.js`).
  This is deliberately the simple version of "buyer accounts": there is no
  password and no email verification (no code or magic link sent to prove
  the address is theirs), so anyone who knows a buyer's email can see their
  order history here. That's a real, accepted trade-off for staying simple
  without adding an email-delivery service — not a bug to quietly patch.
  It returns only buyer-safe summary fields, same as the per-order receipt.
- **The floating contact button** (`public/js/contact-widget.js`, shown on
  every page) links straight to WhatsApp and email using `SITE.phone` /
  `SITE.email` in `public/js/config.js` — **replace those placeholder
  values with your real number and address before launch.** It's a simple
  "contact us" link, not a live chat: no in-page chat window, no support
  ticket queue, no staff routing. Wiring up real live chat would mean
  adding a third-party chat service (e.g. Tawk.to, Crisp).

## What's intentionally NOT built yet

- **Password-based seller/admin login.** The seller dashboard and the
  refund route both use a shared-secret pattern (an unguessable
  `access_token` for sellers, an `ADMIN_API_KEY` header for admins) rather
  than real accounts with sessions, password reset, or roles — a pragmatic
  MVP substitute, not a full auth system. A seller who loses their
  dashboard link, or an org that needs more than one admin, needs real
  accounts before that's solved.
- **Verified buyer accounts.** `/orders.html` (above) covers the common
  case without a login, but it isn't a substitute for real accounts if
  order history needs to be kept private from anyone who guesses an email.
- **Live chat / support tickets.** The contact widget (above) is direct
  links only — no in-page chat, no ticket history, no staff dashboard.
- **mNakfa checkout.** Sellers can register an mNakfa number (above), but
  buyers can't yet pay through the site with it — that money movement
  happens entirely outside Hibretfamily today, with the seller confirming
  receipt themselves off-platform.

## Re-theming after deployment

Every color, font, spacing value and radius the storefront uses is a CSS
custom property declared in `public/css/theme.css`. To reskin the site —
new season colors, a different heading font, a logo swap — **edit only
that file**. Because it's plain CSS values (not executable code), it's
safe to hand to a designer or store manager to change directly, even on a
live deployment, without touching `style.css`, the JS, or the backend.

## Deploying

- **Frontend**: any static host (Netlify, Vercel, Cloudflare Pages, S3 +
  CloudFront). Point it at `public/` as the publish directory.
- **Backend**: any Node host (Render, Railway, Fly.io, a VM). Set the same
  environment variables as `server/.env.example`, plus `CLIENT_URL`
  pointing at your deployed frontend origin (used for CORS and Stripe
  redirect URLs).
- **Database**: Supabase (hosted Postgres + Row Level Security), already
  modeled in `supabase/schema.sql`.
- **Stripe**: enable Connect on your Stripe account, register a real
  webhook endpoint pointing at `/api/webhooks/stripe`, and create the
  premium subscription product/price for `STRIPE_PREMIUM_PRICE_ID`.

## Roadmap / next steps

- Replace the access-token/admin-key shared-secret patterns with real
  password-based accounts (seller self-serve recovery, multiple admins,
  roles) once the project needs them.
- Wire up buyer accounts if order history needs to live anywhere besides
  Stripe's own receipt emails.
- Build an actual "Pay with mNakfa" checkout path (a pending-confirmation
  order state, a seller "mark as paid" action) once the manual version
  above is proven out.
- Produce the promotional video from `marketing/promotional-video-script.md`.
