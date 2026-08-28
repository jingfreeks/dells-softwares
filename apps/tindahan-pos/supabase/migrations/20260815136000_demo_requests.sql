-- Landing page demo-request form -- table for the new submit-demo-request
-- Edge Function.
--
-- RLS is enabled with NO policies for anon/authenticated: the table is
-- unreachable except through the function's service_role client, the same
-- pattern pair-device already uses for a privileged, anonymously-callable
-- write. This means a visitor can never read another visitor's submission,
-- and a bug in the client can never turn into an arbitrary insert/select --
-- the Edge Function is the only door.
create table public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text not null,
  mobile text not null,
  email text,
  business_type text not null,
  locations text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.demo_requests enable row level security;

comment on table public.demo_requests is
  'Leads captured by the landing page''s "Book a demo" form. Written only '
  'by the submit-demo-request Edge Function (service_role) -- no RLS '
  'policy grants anon/authenticated any access.';
