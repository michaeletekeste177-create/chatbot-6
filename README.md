# Hibretfamily

A full-stack storefront for **Hibretfamily** — a family department store
selling the latest fashion for women, men and children, plus shoes,
electronics, books and cosmetics, both online and in physical stores.

```
public/            static frontend — no build step required
├── index.html         all page markup
├── css/
│   ├── theme.css       ← EVERY color/font/spacing value. Edit this to re-theme.
│   └── style.css       component styles, reads theme.css tokens only
└── js/
    ├── config.js       site config, categories, store locations, demo data
    ├── cart.js         cart state (localStorage)
    ├── catalog.js       fetches products from the backend, with demo fallback
    ├── ui.js            nav, drawers, modal, sliders, toasts (generic DOM helpers)
    └── main.js          wires everything together, renders the page

server/             Node.js/Express backend — the secure payment layer
├── config/supabase.js  Supabase client (service-role key, server-only)
├── routes/
│   ├── products.js     GET /api/products, /api/products/:id
│   └── checkout.js     POST /api/checkout/create-session, Stripe webhook
└── server.js            app entry point

supabase/schema.sql  products, orders, order_items, customers + Row Level Security
scripts/verify-env.sh  checks Node/npm are installed
```

## Why there's a backend at all (not just Supabase + Stripe from the browser)

The frontend **never** holds a Supabase service key or a Stripe secret key —
it only calls our own `/api/*` routes. At checkout the browser sends product
IDs and quantities; **prices are always re-read from Supabase on the
server** before a Stripe Checkout Session is created, so a tampered
client-side price can never reach Stripe. Order status is only ever flipped
to "paid" by a signature-verified Stripe webhook, never by the browser.

## Frontend — running it on its own

The frontend is plain HTML/CSS/JS (ES modules, no build step, no
framework lock-in) and works standalone:

```bash
npx http-server public -p 8080
# open http://localhost:8080
```

If it can't reach the backend, it automatically shows a curated **demo
catalog** (see `public/js/config.js` → `DEMO_PRODUCTS`) so the site always
looks and works fully, with a small banner noting it's demo data. This is
what lets you preview or deploy the frontend independently of the backend.

## Backend — full setup (catalog + payments)

1. **Check your environment**
   ```bash
   bash scripts/verify-env.sh
   ```
2. **Create the Supabase schema** — paste `supabase/schema.sql` into the
   Supabase SQL editor (or `supabase db push`).
3. **Configure and run the backend**
   ```bash
   cd server
   cp .env.example .env
   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   npm install
   npm run dev
   ```
   Backend runs at `http://localhost:4000`.
4. **Point the frontend at it** — before `</body>` in `public/index.html`,
   set `window.HIBRETFAMILY_API_BASE` to your backend URL (defaults to
   `http://localhost:4000/api`), or edit `API_BASE` directly in
   `public/js/config.js`.
5. **Stripe webhook (local dev)**
   ```bash
   stripe listen --forward-to localhost:4000/api/checkout/webhook
   ```

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
  pointing at your deployed frontend origin (used for CORS and Stripe's
  success/cancel redirect URLs).
- **Database**: Supabase (hosted Postgres + auth + Row Level Security),
  already modeled in `supabase/schema.sql`.

## Roadmap / next steps

- Wire real product photography and inventory into Supabase.
- Add a lightweight authenticated admin view for managing products/orders
  (the schema and RLS policies already separate customer vs. service-role
  access to make this straightforward).
- Add customer accounts (Supabase Auth) so `orders`/`customers` RLS
  policies come into use.
