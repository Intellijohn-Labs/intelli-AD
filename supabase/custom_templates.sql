-- Company templates: uploaded by admins in /admin/templates, listed to clients in the Invitation & Greeting studio (Step 1).
-- Safe to re-run in the Supabase SQL editor.
create table if not exists public.custom_templates (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null,
  description             text not null default '',
  kind                    text not null check (kind in ('invitation', 'greeting')),
  category                text not null default 'custom' check (category in ('wedding', 'birthday', 'housewarming', 'baby', 'events', 'inauguration', 'festival', 'custom')),
  media_type              text not null check (media_type in ('image', 'video')),
  media_url               text not null,
  storage_path            text not null,            -- object path in the company-templates bucket (used to clean up on delete)
  default_greeting_format text not null default '',  -- e.g. 'Dear {Name}, {Place}' or 'To: {Name} & Family'
  is_active               boolean not null default true,
  created_at              timestamptz not null default now()
);
create index if not exists custom_templates_list_idx on public.custom_templates (kind, is_active, created_at desc);
-- RLS ON with NO policies: only the server's service-role client (GET /api/templates and /api/admin/templates) reads or writes this table.
alter table public.custom_templates enable row level security;

-- Public bucket (clients' browsers load the artwork / clip by URL); objects are written only by the server through signed upload URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-templates', 'company-templates', true, 16777216, array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
NOTIFY pgrst, 'reload schema';
