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
