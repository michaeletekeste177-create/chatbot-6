-- Hibretfamily — Supabase schema
-- Run in the Supabase SQL editor, or via `supabase db push`
--
-- Hibretfamily is a MULTI-VENDOR MARKETPLACE: independent sellers list
-- and price their own products; Hibretfamily never holds their money.
-- Every sale is a Stripe Connect "destination charge" — the buyer pays
-- once, Stripe splits it instantly between the seller's own connected
-- account (their payout) and Hibretfamily's account (its commission).
-- No wallet, no holding period, no manual payout run.

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

-- freemium: new/small sellers, no subscription fee, standard commission.
-- subscription: larger merchants paying a recurring platform fee —
-- server/routes/subscriptions.js gives them a reduced commission rate
-- as the incentive (see PLATFORM_COMMISSION_PERCENT_PREMIUM in .env).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'seller_tier') then
    create type seller_tier as enum ('freemium', 'subscription');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pending', 'paid', 'refunded', 'disputed', 'cancelled');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- sellers — one row per merchant. `stripe_account_id` is their Stripe
-- Connect Express account; `charges_enabled` flips to true via the
-- account.updated webhook once they finish Stripe's own onboarding
-- (identity, bank details) — Hibretfamily never collects or stores
-- that itself. `agreed_to_liability_terms` must be true before
-- server/routes/sellers.js will create the account at all: sellers,
-- not the platform, are liable for what they list (see the bilingual
-- disclaimer in public/index.html's "Sell on Hibretfamily" section).
-- ---------------------------------------------------------------------
create table if not exists public.sellers (
  id                        uuid primary key default uuid_generate_v4(),
  business_name             text not null,
  email                     text not null unique,
  tier                      seller_tier not null default 'freemium',
  stripe_account_id         text unique,
  charges_enabled           boolean not null default false,
  stripe_subscription_id    text unique,
  subscription_status       text,
  agreed_to_liability_terms boolean not null default false,
  created_at                timestamptz not null default now()
);

create index if not exists idx_sellers_stripe_account on public.sellers (stripe_account_id);

-- ---------------------------------------------------------------------
-- products — now owned by a seller, with a real price and stock count
-- (this is a real marketplace, not a curated link list). Deactivating
-- a listing (is_active = false) hides it without losing order history
-- that references it.
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default uuid_generate_v4(),
  seller_id    uuid not null references public.sellers(id) on delete cascade,
  name         text not null,
  category     product_category not null,
  audience     product_audience not null default 'unisex',
  price_cents  integer not null check (price_cents >= 0),
  currency     text not null default 'usd',
  stock        integer not null default 0 check (stock >= 0),
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_products_seller on public.products (seller_id);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_audience on public.products (audience);
create index if not exists idx_products_active on public.products (is_active);

-- ---------------------------------------------------------------------
-- orders — one row per checkout. Deliberately single-seller: a
-- Stripe destination charge has exactly one `transfer_data.destination`,
-- so a cart can only ever hold one seller's products at a time (see
-- public/js/cart.js) and checkout enforces the same server-side.
-- `commission_cents` is what Hibretfamily's platform account keeps;
-- `subtotal_cents - commission_cents` is what actually reaches the
-- seller's own Stripe balance — Hibretfamily's account never holds it.
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                    uuid primary key default uuid_generate_v4(),
  seller_id             uuid not null references public.sellers(id) on delete restrict,
  buyer_email           text,
  status                order_status not null default 'pending',
  subtotal_cents        integer not null default 0,
  commission_cents      integer not null default 0,
  currency              text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_orders_seller on public.orders (seller_id);
create index if not exists idx_orders_stripe_session on public.orders (stripe_checkout_session_id);
create index if not exists idx_orders_stripe_intent on public.orders (stripe_payment_intent_id);

-- ---------------------------------------------------------------------
-- order_items — line items, price snapshotted at purchase time so a
-- later price edit on the product never rewrites order history.
-- ---------------------------------------------------------------------
create table if not exists public.order_items (
  id               uuid primary key default uuid_generate_v4(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  quantity         integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create index if not exists idx_order_items_order on public.order_items (order_id);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.sellers     enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Products: publicly readable when active (storefront catalog).
-- Writes only via the service-role key from the backend.
drop policy if exists "active products are publicly readable" on public.products;
create policy "active products are publicly readable"
  on public.products for select
  using (is_active = true);

-- Sellers, orders and order_items hold commission-sensitive and
-- Stripe-account data and are never read by the storefront directly —
-- intentionally NO select policy on any of them. The backend's product
-- listing joins in just `sellers.business_name` server-side (using the
-- service-role key, which bypasses RLS) rather than exposing the
-- sellers table itself. RLS with zero policies denies all anon access.

-- Note: all writes to sellers/products/orders/order_items happen from
-- server.js using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS. Never
-- expose that key to the frontend.
