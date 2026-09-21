-- Hibretfamily — Supabase schema
-- Run in the Supabase SQL editor, or via `supabase db push`
--
-- Hibretfamily is an AFFILIATE storefront: it holds no inventory and
-- processes no payments. Every product row is a curated link to an
-- external store (e.g. Amazon); a purchase happens entirely on that
-- store's own site. This schema reflects that: no price/stock on
-- products, no orders/customers, just a lean catalog plus a click log
-- for commission reconciliation.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Product category enum (apparel, shoes, electronics, books, cosmetics).
-- Values stay in English so they're a stable join/filter key; the
-- storefront renders them in Tigrinya via the I18N table in
-- public/js/config.js (cat_apparel, cat_shoes, ...), so the Tigrinya
-- label is never duplicated — and never able to drift out of sync —
-- across rows.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_category') then
    create type product_category as enum (
      'apparel', 'shoes', 'electronics', 'books', 'cosmetics'
    );
  end if;
end$$;

-- Who a product is aimed at. Only meaningful for apparel/shoes, but
-- kept on every row (default 'unisex') so the storefront's Women/Men/
-- Kids filter can query a single flat table.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'product_audience') then
    create type product_audience as enum (
      'women', 'men', 'kids', 'unisex'
    );
  end if;
end$$;

-- ---------------------------------------------------------------------
-- products — the curated catalog. No price, no stock: we don't sell
-- these directly, we link to whoever does. `affiliate_url` is the
-- external store/affiliate link and is intentionally NEVER exposed by
-- the public products API (see server/routes/products.js) — the
-- storefront only ever links to it indirectly through
-- /api/track-click, so every outbound click is logged before the
-- redirect happens.
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  category       product_category not null,
  audience       product_audience not null default 'unisex',
  image_url      text,
  affiliate_url  text not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_audience on public.products (audience);

-- ---------------------------------------------------------------------
-- click_events — one row per outbound click, written by
-- server/routes/track.js right before it redirects the shopper to
-- affiliate_url. This is the ledger a store owner reconciles against
-- the affiliate network's own commission reports; `affiliate_url` is
-- snapshotted here (not just looked up via product_id) so the record
-- stays meaningful even if a product's link is later edited or the
-- row is deleted.
-- ---------------------------------------------------------------------
create table if not exists public.click_events (
  id             uuid primary key default uuid_generate_v4(),
  product_id     uuid references public.products(id) on delete set null,
  affiliate_url  text not null,
  referrer       text,
  user_agent     text,
  clicked_at     timestamptz not null default now()
);

create index if not exists idx_click_events_product on public.click_events (product_id);
create index if not exists idx_click_events_clicked_at on public.click_events (clicked_at);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.products     enable row level security;
alter table public.click_events enable row level security;

-- Products: publicly readable (storefront catalog). Writes only via
-- the service-role key from the backend (no policy = no anon writes).
drop policy if exists "products are publicly readable" on public.products;
create policy "products are publicly readable"
  on public.products for select
  using (true);

-- Click events hold commission-sensitive traffic data and are never
-- read by the storefront itself — intentionally NO select policy, so
-- only the service-role key (used from server/routes/track.js) can
-- read or write them. RLS with zero policies denies all anon access.

-- Note: inserts/updates to products and click_events are done from
-- server.js using the SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- Never expose that key to the frontend.
