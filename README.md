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
├── confirm-receipt.html buyer's "I received it" page, linked from the shipped SMS
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
    ├── confirm-receipt.js buyer delivery-confirmation logic (confirm-receipt.html)
    └── contact-widget.js  floating WhatsApp/email contact button, on every page

server/             Node.js/Express backend
├── config/supabase.js  Supabase client (service-role key, server-only)
├── lib/notify.js       order-confirmation SMS/WhatsApp via Twilio — optional
├── routes/
│   ├── products.js     GET /api/products — catalog, joined with seller name
│   ├── sellers.js       POST /api/sellers/register, GET /api/sellers/:id/status
│   ├── seller-products.js  CRUD for a seller's own listings, gated by their access_token
│   ├── seller-orders.js  GET /api/seller-orders (token-gated) + PATCH .../:id/mark-paid, .../:id/ship
│   ├── checkout.js      POST /api/checkout/create-session — the split-payment gateway
│   ├── subscriptions.js POST /api/subscriptions/create-checkout-session — premium tier billing
│   ├── webhooks.js       POST /api/webhooks/stripe — the source of truth for payment state
│   └── orders.js         GET /api/orders?email=, GET /api/orders/:id/receipt,
│                         POST /api/orders/:id/confirm-receipt, POST /:id/refund (admin-key gated)
└── server.js            app entry point

supabase/schema.sql  sellers, products, orders (with requested delivery date/note,
                      manual shipped/received confirmation), order_items,
                      decrement_product_stock() + RLS
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
contact described next, which additionally requires an active subscription
(see below).

### Product photos

A seller uploads a photo straight from their device (`dashboard.html`'s
"Product photo" file picker) instead of needing to host one elsewhere and
paste a URL. `POST /api/seller-products/upload-image` (token-gated the
same way as every other write here) accepts the file via `multer`
(`memoryStorage` — never written to this server's own disk, since Render's
filesystem is ephemeral) and uploads it to a Supabase Storage bucket named
`product-images`, under a path scoped to the seller's own id so uploads
can never collide. The returned public URL is saved as the product's
`image_url`, exactly as if the seller had pasted one in manually.

**Manual setup required**: this bucket is not created by `schema.sql` (it's
a Storage bucket, not a table) and must exist before any upload will work.
In the Supabase dashboard: **Storage** → **New bucket** → name it exactly
`product-images` → **Public bucket**: on (product photos are meant to be
publicly viewable in the catalog, same as any `image_url` already was).

### Seller story (optional bio)

`dashboard.html`'s "Your story" section lets a seller write a short,
free-text bio (`sellers.story`, up to 1000 characters) — who they are, what
they make, why — saved via `PATCH /api/sellers/:id/story` (token-gated the
same way as every other write here). `GET /api/products` and
`GET /api/products/:id` join it in alongside `sellerName` as `sellerStory`,
and the storefront shows it in the product quick-view (`public/js/main.js`)
under "Sold by". An empty story is treated as "not set", not an error —
a seller taking their bio down is a legitimate thing to want.

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
- Stripe `charges_enabled` alone satisfies the "must have a payment method"
  gate above. An `mnakfa_number` alone does **not** — see "How Hibretfamily
  earns from an mNakfa seller" below for why, and what else it takes.
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

## Required shipping address

Unlike the preferred delivery date/note above (both optional), a checkout
now requires a **shipping address** (`public/index.html`'s cart drawer,
`deliveryAddress` field) — an order with nowhere to ship it is a seller
stuck holding paid stock with no way to fulfill it. It's enforced twice:
client-side in `public/js/main.js`'s `startCheckout()` (so a buyer finds
out before starting a Stripe session), and authoritatively server-side in
`server/routes/checkout.js` (since the client-side check can't be trusted
alone). It's stored as free text on the order (`delivery_address` in
`supabase/schema.sql`) rather than structured street/city/postal fields,
since a rigid Western-style address form doesn't fit every place an order
might ship from or to. It's shown back to the buyer on their receipt
(`success.html`/`success.js`) and to the seller in their dashboard's
Orders section, right alongside the requested delivery date/note, since
it's the first thing a seller needs before packing a shipment.

**Manual migration required**: existing databases need the new column
added once in the Supabase SQL Editor before this ships to production:

```sql
alter table public.orders add column if not exists delivery_address text;
```

(Already included in `supabase/schema.sql` for fresh installs.)

## Clothing size at checkout

For tailored/made-to-order items — traditional wear in particular, where
there's no fixed off-the-rack stock to pick a listed size from — a buyer
can optionally give their size at checkout, two ways at once: a standard
label (XS–XXL) and/or exact body measurements in cm (waist, chest/bust,
hip, height). Both are entirely optional and independent of each other —
a buyer might know only one, both, or neither, and most products (books,
electronics...) need neither at all, so nothing here blocks a checkout
that leaves every size field blank. Stored on the order (`size_standard`,
`size_waist_cm`, `size_chest_cm`, `size_hip_cm`, `size_height_cm` in
`supabase/schema.sql`), validated in `server/routes/checkout.js` (the
standard label against a fixed list, each measurement as a positive
number under 300cm), and shown — via the shared `formatSize()` helper in
`public/js/ui.js`, so the two surfaces can't drift apart — on both the
buyer's receipt and the seller's dashboard order list, right alongside
the shipping address, since a seller making or selecting a tailored item
needs this before they can even start.

**Manual migration required**: existing databases need these new columns
added once in the Supabase SQL Editor before this ships to production:

```sql
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists size_standard text;
alter table public.orders add column if not exists size_waist_cm integer;
alter table public.orders add column if not exists size_chest_cm integer;
alter table public.orders add column if not exists size_hip_cm integer;
alter table public.orders add column if not exists size_height_cm integer;
```

(Already included in `supabase/schema.sql` for fresh installs. The
`delivery_address` line above is included here too since — as discovered
during this feature's audit — it was never actually added to the
schema's own migration block despite already being in production;
running it again is harmless if already applied.)

## Checking out with a seller who only has mNakfa

Stripe has no presence in Eritrea, so a seller who's only recorded an mNakfa
number in **Payment Settings** (no `stripe_account_id`/`charges_enabled`)
can still be checked out from — `checkout.js` branches on this: instead of
creating a Stripe Checkout Session, it creates the order directly (status
`pending`) and returns `{ paymentMethod: 'mnakfa', mnakfaNumber,
mnakfaHolderName }`. The cart drawer shows those details in place of
redirecting to Stripe, and the buyer sends the mNakfa transfer themselves,
outside the platform entirely.

Because there's no Stripe hosted page for this path to collect a buyer's
email/phone, the cart drawer asks for both directly (`public/index.html`) —
optional for a Stripe checkout (Stripe's own page collects them there
instead) but the only way `buyer_phone` gets set for an mNakfa order, which
the delivery-confirmation flow below depends on.

The seller confirms payment themselves once they've verified the transfer
(`PATCH /api/seller-orders/:id/mark-paid`, shown as **"Mark as paid
(mNakfa)"** in the dashboard) — there's no webhook for this path to do it
automatically. This flow only tracks that a sale happened and was paid;
`commission_cents` is still recorded on the order for later reference, but
nothing here bills or collects it per-order — see the next section for how
Hibretfamily actually earns from an mNakfa seller.

## How Hibretfamily earns from an mNakfa seller

A Stripe sale pays Hibretfamily its commission automatically
(`application_fee_amount`, above) — an mNakfa sale can't, since the buyer
pays the seller directly and mNakfa has no API for Hibretfamily to collect
through. So instead of a per-sale commission, an mNakfa-only seller (no
Stripe `charges_enabled`) is required to be on the same paid subscription
that Stripe sellers can opt into for a lower commission rate
(`STRIPE_PREMIUM_PRICE_ID`, same price for both): see
`hasPaymentMethod()` in `server/routes/seller-products.js`, which only
treats an `mnakfa_number` as a real payment method once
`subscription_status === 'active'`. `dashboard.html`'s Payment Settings
section surfaces a **"Subscribe"** button (`POST
/api/subscriptions/create-checkout-session`) for exactly this. A seller
with Stripe `charges_enabled` isn't required to subscribe — the
subscription there is still optional, just for the lower commission rate.

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

## Manual delivery confirmation (for orders paid outside Stripe)

A Stripe order gets its `paid`/stock-decrement update automatically from the
`checkout.session.completed` webhook — but an order paid through a seller's
own mNakfa contact (see "Checking out with a seller who only has mNakfa"
above) never touches Stripe at all, so there's no webhook to mark anything.
This flow closes that gap with a manual, seller-triggered confirmation
instead:

1. A seller (or their in-country contact) marks an order **"shipped"** from
   their dashboard (`PATCH /api/seller-orders/:id/ship`, token-gated the
   same way as every other seller-products write).
2. That texts the buyer (via `notifyBuyerOrderShipped` in
   `server/lib/notify.js`, same optional Twilio setup as above) a link to
   `public/confirm-receipt.html?order=<id>&token=<delivery_confirmation_token>`.
3. The buyer taps **"I have received the item(s) sent to me from
   Hibretfamily"** once it arrives, which calls the public
   `POST /api/orders/:id/confirm-receipt` — same unguessable-UUID-is-the-
   authorization model as the existing receipt route, no buyer login needed.
4. Both timestamps (`shipped_at`, `received_at` in `supabase/schema.sql`)
   show up in the seller's Orders list, so a seller can see at a glance
   which mNakfa orders are still awaiting confirmation.

This is deliberately not real-time package tracking (no courier API exists
to plug into for informal domestic shipping in Eritrea) — it's a simple
two-step paper trail that also settles "I never received it" disputes.

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

## Site completeness audit (October 2026)

A full pass over every page and route looking for anything a real,
production e-commerce site needs that was missing or incorrect — not a
new feature, just closing gaps. Two kinds of findings came out of it:

**Removed: fabricated content.** The original template build shipped
with placeholder "demo" copy that was never swapped for anything real
before launch, and it was live on the site: a "Visit us in person"
section listing three physical store addresses with invented Eritrean
phone numbers, a "What our customers say" testimonials carousel with
quotes attributed to named people who don't exist, a "4.8 rated by
2,000+ families" badge, and "online or in-store" / "online and
in-store" copy implying physical locations. None of this was true —
Hibretfamily has no physical stores and no collected reviews yet — and
in the Netherlands/EU, presenting fabricated reviews as genuine is a
real legal risk (unfair commercial practices), not just a trust
problem. All of it has been removed: `STORE_LOCATIONS` and
`TESTIMONIALS` are gone from `public/js/config.js`, their rendering
code is gone from `public/js/main.js`/`ui.js`, their markup and CSS
are gone from `index.html`/`style.css`, and the trust-strip/hero copy
was rewritten to claims that are actually true today. Also removed:
three dead placeholder social links (Instagram/Facebook/TikTok, all
`href="#"`) and an "Advertising" clause in the privacy policy
describing Google AdSense, which isn't actually integrated anywhere.
When Hibretfamily does open a physical store or collect real reviews,
add that content back with real data — don't restore the old
placeholders.

**Added: missing technical essentials.**
- **Social sharing previews** (Open Graph + Twitter Card meta tags,
  plus a generated `public/assets/og-image.png`) on the public pages,
  so a WhatsApp/Facebook link share shows a real title, description,
  and branded image instead of nothing.
- **`public/robots.txt` and `public/sitemap.xml`** so Google can
  actually find and index the site; account-specific pages (dashboard,
  orders, success, confirm-receipt) are excluded from both, on top of
  their existing per-page `noindex` tag.
- **`public/404.html`**, a branded bilingual not-found page, wired up
  in `netlify.toml` so a bad/old link gets this instead of a generic
  host error page.
- **`public/site.webmanifest`** plus real PNG icons
  (`public/assets/icon-192.png`, `icon-512.png`,
  `apple-touch-icon.png`, `favicon.png`) so the site can be added to a
  phone's home screen with a proper icon — relevant given how many
  sellers and buyers here are on mobile.
- **Rate limiting** (`express-rate-limit` in `server/server.js`): a
  generous whole-API ceiling against scraping/DoS-ish traffic, plus a
  tighter limit on the two endpoints that are cheap to spam with no
  payment or auth involved (`POST /api/sellers/register`,
  `POST /api/lesson-interest`).
- **A clean JSON 404** for any unmatched API route, instead of
  Express's default HTML error page — this backend is API-only, so
  every response should be JSON.
- **Security headers on the static frontend** (`netlify.toml`):
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`. The backend already had these via `helmet()`;
  Netlify serves the frontend directly and never touches that process.

### Site domain

`https://hibretfamily.com` — registered via Namecheap (10-year
registration) and used throughout `public/robots.txt`,
`public/sitemap.xml`, and the `<link rel="canonical">` / `og:url` tags
on `index.html`, `sell.html`, `learn.html`, and `privacy.html`.
Registering the domain is only step one, though: it has to be pointed
at the live site before any of this matters.

- **If the site is hosted on Netlify**: add `hibretfamily.com` as a
  custom domain in the Netlify dashboard (Site settings → Domain
  management → Add a domain), then follow Netlify's instructions to
  either point the domain's nameservers at Netlify DNS or add the
  A/CNAME records it gives you, in the Namecheap dashboard's Advanced
  DNS tab. Netlify also issues a free HTTPS certificate once DNS
  resolves — that can take anywhere from a few minutes to ~24 hours.
- Until that's done, `hibretfamily.com` won't actually load the site
  even though it's registered and paid for.

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
