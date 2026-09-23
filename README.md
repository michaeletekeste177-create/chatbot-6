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
    └── success.js        receipt page logic (success.html)

server/             Node.js/Express backend
├── config/supabase.js  Supabase client (service-role key, server-only)
├── routes/
│   ├── products.js     GET /api/products — catalog, joined with seller name
│   ├── sellers.js       POST /api/sellers/register, GET /api/sellers/:id/status
│   ├── seller-products.js  CRUD for a seller's own listings, gated by their access_token
│   ├── checkout.js      POST /api/checkout/create-session — the split-payment gateway
│   ├── subscriptions.js POST /api/subscriptions/create-checkout-session — premium tier billing
│   ├── webhooks.js       POST /api/webhooks/stripe — the source of truth for payment state
│   └── orders.js         GET /api/orders/:id/receipt, POST /api/orders/:id/refund (admin-key gated)
└── server.js            app entry point

supabase/schema.sql  sellers, products, orders, order_items + Row Level Security
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

## What's intentionally NOT built yet

- **Password-based seller/admin login.** The seller dashboard and the
  refund route both use a shared-secret pattern (an unguessable
  `access_token` for sellers, an `ADMIN_API_KEY` header for admins) rather
  than real accounts with sessions, password reset, or roles — a pragmatic
  MVP substitute, not a full auth system. A seller who loses their
  dashboard link, or an org that needs more than one admin, needs real
  accounts before that's solved.
- **Buyer accounts.** Checkout only asks for an email; there's no login, so
  a buyer's order history lives only in their Stripe receipt email and the
  unguessable order-confirmation URL.

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
- Produce the promotional video from `marketing/promotional-video-script.md`.
