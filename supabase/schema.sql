-- Hibretfamily — Supabase schema
-- Run in the Supabase SQL editor, or via `supabase db push`

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Product category enum (apparel, shoes, electronics, books, cosmetics)
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
-- customers — one row per authenticated shopper (linked to auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  full_name    text,
  phone        text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- products — shared table for all five categories, distinguished by
-- the `category` column so the storefront can query/filter by section
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  category     product_category not null,
  audience     product_audience not null default 'unisex',
  price_cents  integer not null check (price_cents >= 0),
  currency     text not null default 'usd',
  stock        integer not null default 0 check (stock >= 0),
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_audience on public.products (audience);
create index if not exists idx_products_active on public.products (is_active);

-- ---------------------------------------------------------------------
-- orders — one row per checkout attempt
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                    uuid primary key default uuid_generate_v4(),
  customer_id           uuid references public.customers(id) on delete set null,
  status                text not null default 'pending'
                         check (status in ('pending','paid','failed','refunded','cancelled')),
  total_cents           integer not null default 0,
  currency              text not null default 'usd',
  stripe_session_id     text unique,
  stripe_payment_intent text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_stripe_session on public.orders (stripe_session_id);

-- ---------------------------------------------------------------------
-- order_items — line items, price snapshotted at time of purchase
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
alter table public.customers   enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Products: publicly readable (storefront catalog). Writes only via
-- the service-role key from the backend (no policy = no anon writes).
drop policy if exists "products are publicly readable" on public.products;
create policy "products are publicly readable"
  on public.products for select
  using (is_active = true);

-- Customers: a user can read/update only their own row.
drop policy if exists "customers read own row" on public.customers;
create policy "customers read own row"
  on public.customers for select
  using (auth.uid() = id);

drop policy if exists "customers update own row" on public.customers;
create policy "customers update own row"
  on public.customers for update
  using (auth.uid() = id);

-- Orders: a user can read only their own orders.
drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders"
  on public.orders for select
  using (auth.uid() = customer_id);

-- Order items: readable only through the parent order's ownership.
drop policy if exists "customers read own order items" on public.order_items;
create policy "customers read own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = auth.uid()
    )
  );

-- Note: inserts/updates to orders, order_items and products are done
-- from server.js using the SUPABASE_SERVICE_ROLE_KEY, which bypasses
-- RLS. Never expose that key to the frontend.
