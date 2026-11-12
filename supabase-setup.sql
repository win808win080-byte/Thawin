-- Replace YOUR_ADMIN_EMAIL with the email used by the Supabase admin account
-- before running this script in Supabase SQL Editor.

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text not null,
  link text,
  image_paths text[] not null,
  pdf_path text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_projects enable row level security;

grant select on public.portfolio_projects to anon, authenticated;
grant insert, update, delete on public.portfolio_projects to authenticated;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = lower('YOUR_ADMIN_EMAIL'), false);
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to authenticated;

drop policy if exists "Anyone can read portfolio projects" on public.portfolio_projects;
create policy "Anyone can read portfolio projects"
  on public.portfolio_projects
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Portfolio admin can insert projects" on public.portfolio_projects;
create policy "Portfolio admin can insert projects"
  on public.portfolio_projects
  for insert
  to authenticated
  with check (public.is_portfolio_admin());

drop policy if exists "Portfolio admin can update projects" on public.portfolio_projects;
create policy "Portfolio admin can update projects"
  on public.portfolio_projects
  for update
  to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists "Portfolio admin can delete projects" on public.portfolio_projects;
create policy "Portfolio admin can delete projects"
  on public.portfolio_projects
  for delete
  to authenticated
  using (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-assets',
  'portfolio-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read portfolio assets" on storage.objects;
create policy "Anyone can read portfolio assets"
  on storage.objects
  for select
  to public
  using (bucket_id = 'portfolio-assets');

drop policy if exists "Portfolio admin can upload assets" on storage.objects;
create policy "Portfolio admin can upload assets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-assets'
    and public.is_portfolio_admin()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Portfolio admin can delete assets" on storage.objects;
create policy "Portfolio admin can delete assets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and public.is_portfolio_admin()
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
