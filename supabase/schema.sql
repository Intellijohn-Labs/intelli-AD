-- IntelliAd: bookings table, artwork bucket and Row Level Security. Safe to re-run in the Supabase SQL editor.
-- The live project already has a `bookings` table with these columns, so the create is a no-op there.

create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  booking_ref      text not null unique,
  created_at       timestamptz not null default now(),
  ad_type          text not null,
  category         text,
  publication      text not null,
  editions         jsonb not null default '{}'::jsonb,
  release_date     date,
  ad_text          text,
  artwork_url      text,
  dimensions       jsonb not null default '{}'::jsonb,
  enhancements     jsonb not null default '{}'::jsonb,
  pricing          jsonb not null default '{}'::jsonb,
  customer_details jsonb not null default '{}'::jsonb,
  status           text not null default 'pending_payment'
);

-- Partner (Akshaya / agency) bookings carry customer_details.agency = { code, name, ... }.
create index if not exists bookings_agency_idx on public.bookings ((customer_details #>> '{agency,code}'), created_at desc);

alter table public.bookings enable row level security;

-- The browser (anon key) may only INSERT. No select / update / delete policy for anon, so customer names, phones and
-- addresses are never readable with the public key. Partner dashboards read through /api/agency/bookings, which uses
-- the server-only service-role key.
drop policy if exists "anon can insert bookings" on public.bookings;
create policy "anon can insert bookings" on public.bookings
  for insert to anon, authenticated
  with check (status in ('pending_payment', 'confirmed') and booking_ref like 'INT-%');

-- Artwork bucket: public read (the photo is printed in the paper); uploads limited by size and type.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-artworks', 'ad-artworks', true, 52428800,
        array['image/jpeg', 'image/png', 'image/svg+xml', 'image/tiff', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon can upload artwork" on storage.objects;
create policy "anon can upload artwork" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'ad-artworks');

-- Check there is no leftover policy that lets the public key READ bookings (this must return no rows for anon / public):
--   select policyname, roles, cmd, qual from pg_policies where tablename = 'bookings';

-- ── Partner approval (Supabase Auth) ───────────────────────────────────────────
-- Anyone can register asking to be a partner: sign-up stores role/center_code/agency_name in user_metadata, which the
-- user controls. Partner access follows app_metadata.role, which only you can set. Approve a partner by email:
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "akshaya"}'::jsonb   -- or "agency"
--    where email = 'partner@example.com';
-- The user signs out and in again to pick up the new role. To revoke: remove the "role" key from raw_app_meta_data.

-- ── Publication rates (admin-managed rate card) ────────────────────────────────────────────────────────────────────
-- The booking calculator reads these rows (public read). Only a user whose app_metadata.role is 'admin' may write.
-- edition / category may be 'all' to cover every edition / category; the most specific match wins.
create table if not exists public.publication_rates (
  id uuid primary key default gen_random_uuid(),
  newspaper_name text not null,
  edition text not null default 'all',
  category text not null default 'all',
  ad_type text not null check (ad_type in ('classified-text', 'classified-display', 'commercial-display')),
  base_rate numeric(12,2) not null default 0 check (base_rate >= 0),
  extra_line_rate numeric(12,2) not null default 0 check (extra_line_rate >= 0),
  sq_cm_rate numeric(12,2) not null default 0 check (sq_cm_rate >= 0),
  color_surcharge_percent numeric(6,2) not null default 0 check (color_surcharge_percent between 0 and 500),
  updated_at timestamptz not null default now(),
  unique (newspaper_name, edition, category, ad_type)
);

alter table public.publication_rates enable row level security;

drop policy if exists "rates are public" on public.publication_rates;
create policy "rates are public" on public.publication_rates for select to anon, authenticated using (true);

drop policy if exists "admins insert rates" on public.publication_rates;
create policy "admins insert rates" on public.publication_rates for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "admins update rates" on public.publication_rates;
create policy "admins update rates" on public.publication_rates for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "admins delete rates" on public.publication_rates;
create policy "admins delete rates" on public.publication_rates for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Make someone an admin (they sign out and in again to pick it up):
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
--    where email = 'you@example.com';

-- ── Card settings per rate row (minimums, cut-off, GST) and publication settings ────────────────────────────────────
-- ad_type values stay 'classified-text' | 'classified-display' | 'commercial-display' (the app also accepts underscores in uploads).
-- Blank min_lines / min_sq_cm / cutoff_* mean "use the publication's standard setting".
alter table public.publication_rates add column if not exists min_lines integer check (min_lines is null or min_lines between 1 and 50);
alter table public.publication_rates add column if not exists min_sq_cm numeric(8,2) check (min_sq_cm is null or min_sq_cm > 0);
alter table public.publication_rates add column if not exists cutoff_days integer check (cutoff_days is null or cutoff_days between 0 and 30);
alter table public.publication_rates add column if not exists cutoff_time text check (cutoff_time is null or cutoff_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
-- true = the entered rates already include 18% GST (cards say "incl. GST"; the calculator backs GST out before adding it once).
alter table public.publication_rates add column if not exists gst_included boolean not null default false;

-- Per-newspaper settings read by the booking flow: print_days = weekdays it prints (0 = Sunday … 6 = Saturday; null = every
-- day, so the release-date picker disables the other days); enabled_editions = editions shown for booking (null = all).
-- (If this table already exists with newspaper_name as PRIMARY KEY, that is equivalent to NOT NULL UNIQUE: nothing to change.)
create table if not exists public.newspaper_settings (
  newspaper_name text not null unique,
  print_days integer[] default null check (print_days is null or print_days <@ array[0,1,2,3,4,5,6]),
  enabled_editions text[] default null,
  updated_at timestamptz not null default now()
);
alter table public.newspaper_settings enable row level security;
drop policy if exists "settings are public" on public.newspaper_settings;
create policy "settings are public" on public.newspaper_settings for select to anon, authenticated using (true);
-- Writes happen only through the admin server action (service-role key); no insert/update/delete policy for anon or authenticated.

-- ── Ad enhancement charges (classified text): flat extra cost per booking line ──────────────────────────────────────
-- bold first line / heading, tick mark (✔) at the beginning, border box. 0 = free.
ALTER TABLE public.publication_rates ADD COLUMN IF NOT EXISTS bold_heading_rate NUMERIC DEFAULT 0;
ALTER TABLE public.publication_rates ADD COLUMN IF NOT EXISTS tick_rate NUMERIC DEFAULT 0;
ALTER TABLE public.publication_rates ADD COLUMN IF NOT EXISTS border_rate NUMERIC DEFAULT 0;

-- ── Multi-date / repeat insertions ─────────────────────────────────────────────────────────────────────────────────
-- release_date stays the first insertion date; insertion_dates lists all of them; multi_day_discount is the ₹ saved.
alter table public.bookings add column if not exists insertion_dates date[] not null default '{}';
alter table public.bookings add column if not exists multi_day_discount numeric(12,2) not null default 0;

-- ── Promotional banners (login page carousel), managed in /admin/banners ───────────────────────────────────────────
create table if not exists public.promotional_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  link_url text,
  image_url text not null,
  storage_path text not null,           -- object path inside the promo-banners bucket (used to clean up on delete)
  placement text not null default 'login_page',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.promotional_banners enable row level security;
-- Visitors (not signed in) see active banners only; all writes go through admin-only server actions (service role).
drop policy if exists "active banners are public" on public.promotional_banners;
create policy "active banners are public" on public.promotional_banners for select to anon, authenticated using (is_active);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('promo-banners', 'promo-banners', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Public read; only admins (app_metadata.role = 'admin') may upload from the browser. Deletes run server-side.
drop policy if exists "admins upload banners" on storage.objects;
create policy "admins upload banners" on storage.objects for insert to authenticated
  with check (bucket_id = 'promo-banners' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Banner placements: 'login_page' (login card carousel) and 'home_top' (home page right-to-left marquee).
alter table public.promotional_banners drop constraint if exists promotional_banners_placement_check;
alter table public.promotional_banners add constraint promotional_banners_placement_check check (placement in ('login_page', 'home_top'));

-- Banner titles are optional (an untitled banner is stored with an empty title).
alter table public.promotional_banners alter column title drop not null;
alter table public.promotional_banners alter column title set default '';

-- AI provider API keys entered from /admin/settings/ai. RLS is ON with NO policies, so only the server-side
-- service-role client can read or write it (app_settings is publicly readable, so keys must never live there).
create table if not exists public.app_secrets (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
