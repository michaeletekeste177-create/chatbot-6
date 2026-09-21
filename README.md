# Hibretfamily

**Hibretfamily is an affiliate storefront.** It holds no inventory and takes
no payments — it's a curated catalog of fashion (women, men, kids), shoes,
electronics, books and cosmetics that links out to the external stores
(e.g. Amazon) that actually sell each item. Every "Shop Now / ሕጂ ዓድግ" click
is logged for commission reconciliation, then redirected to that item's
real store.

```
public/            static frontend — no build step required
├── index.html         all page markup
├── css/
│   ├── theme.css       ← EVERY color/font/spacing value. Edit this to re-theme.
│   └── style.css       component styles, reads theme.css tokens only
└── js/
    ├── config.js       site config, categories, store locations, demo data, i18n
    ├── catalog.js       fetches products from the backend, with demo fallback
    ├── i18n.js          English / Eritrean Tigrinya toggle
    ├── ui.js            nav, modal, sliders, toasts (generic DOM helpers)
    └── main.js          wires everything together, renders the page

server/             Node.js/Express backend — catalog + click tracking
├── config/supabase.js  Supabase client (service-role key, server-only)
├── routes/
│   ├── products.js     GET /api/products, /api/products/:id (no price/stock — see below)
│   └── track.js         GET /api/track-click?productId=... — logs the click, then redirects
└── server.js            app entry point

supabase/schema.sql  products, click_events + Row Level Security
scripts/verify-env.sh  checks Node/npm are installed
```

## Why there's a backend at all (not just a raw link on each card)

The frontend never links directly to a product's real affiliate URL — every
"Shop Now" button points at our own `/api/track-click?productId=...` instead.
`GET /api/products` deliberately never returns the raw affiliate link either.
That link is only ever read server-side, inside `track.js`, which logs a row
to `click_events` (product, timestamp, referrer, user agent) and *then*
redirects (302) to the real store. That's what makes commission
reconciliation possible, and it keeps the curated links from being trivially
scraped out of the public API. It's a plain `<a href>` under the hood, so it
still works with JavaScript disabled.

## Frontend — running it on its own

The frontend is plain HTML/CSS/JS (ES modules, no build step, no
framework lock-in) and works standalone:

```bash
npx http-server public -p 8080
# open http://localhost:8080
```

If it can't reach the backend, it automatically shows a curated **demo
catalog** (see `public/js/config.js` → `DEMO_PRODUCTS`) so the site always
looks and works fully, with a small banner noting it's demo data. Demo
products link straight to an Amazon search for that product name (a real,
working link, not a fabricated one) since there's no backend to proxy
the click through in that mode — wire up real per-product affiliate links
(with your own Associates tag) once you're editing actual catalog rows.

## Backend — full setup (catalog + click tracking)

1. **Check your environment**
   ```bash
   bash scripts/verify-env.sh
   ```
2. **Create the Supabase schema** — paste `supabase/schema.sql` into the
   Supabase SQL editor (or `supabase db push`). This creates `products`
   (name, category, audience, image_url, affiliate_url) and `click_events`
   (the outbound-click log) — no orders, no customers, no price/stock.
3. **Configure and run the backend**
   ```bash
   cd server
   cp .env.example .env
   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   npm install
   npm run dev
   ```
   Backend runs at `http://localhost:4000`.
4. **Point the frontend at it** — before `</body>` in `public/index.html`,
   set `window.HIBRETFAMILY_API_BASE` to your backend URL (defaults to
   `http://localhost:4000/api`), or edit `API_BASE` directly in
   `public/js/config.js`.
5. **Add products** — insert rows into `products` via the Supabase table
   editor: `name`, `category` (apparel/shoes/electronics/books/cosmetics),
   `audience` (women/men/kids/unisex), `image_url`, and `affiliate_url`
   (your real, tagged affiliate link for that item).

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
  pointing at your deployed frontend origin (used for CORS).
- **Database**: Supabase (hosted Postgres + Row Level Security), already
  modeled in `supabase/schema.sql`.

## Roadmap / next steps

- Wire real product photography and real, tagged affiliate links into
  Supabase in place of the demo catalog.
- Build a small internal report (or reuse Supabase's table view) over
  `click_events` for commission reconciliation against each affiliate
  network's own reporting.
- Add a lightweight authenticated admin view for managing `products` rows
  without going through the Supabase dashboard directly.
