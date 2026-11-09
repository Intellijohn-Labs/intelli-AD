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
