-- Blank: Project: database setup for Supabase.
-- Run this once in the Supabase dashboard (SQL Editor → New query → paste → Run),
-- or with the Supabase CLI: `supabase db push`.

-- ---------- profiles: one row per account; is_admin unlocks the admin panel ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- is_admin() is used by the policies below; security definer so it can read profiles under RLS
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: update own name" on public.profiles;
create policy "profiles: update own name" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- players may only change their display name, never is_admin
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- a profile is created automatically for every new account
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- saves: each player's progress (the whole save as JSON) ----------
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
drop policy if exists "saves: own row" on public.saves;
create policy "saves: own row" on public.saves for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- game_content: the admin's shared content (pool, banners, clothes, memories, notices, media list) ----------
create table if not exists public.game_content (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);
alter table public.game_content enable row level security;
drop policy if exists "content: everyone reads" on public.game_content;
create policy "content: everyone reads" on public.game_content for select using (true);
drop policy if exists "content: admins write" on public.game_content;
create policy "content: admins write" on public.game_content for all using (public.is_admin()) with check (public.is_admin());

-- ---------- support_messages: the title screen's contact form ----------
create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  topic text not null,
  message text not null check (char_length(message) <= 2000),
  contact text,
  created_at timestamptz not null default now()
);
alter table public.support_messages enable row level security;
drop policy if exists "support: anyone sends" on public.support_messages;
create policy "support: anyone sends" on public.support_messages for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "support: admins read" on public.support_messages;
create policy "support: admins read" on public.support_messages for select using (public.is_admin());

-- ---------- storage: the admin's images (splash art, icons, wallpapers, clothes, memories) ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do update set public = true;
drop policy if exists "media: everyone reads" on storage.objects;
create policy "media: everyone reads" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media: admins upload" on storage.objects;
create policy "media: admins upload" on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media: admins update" on storage.objects;
create policy "media: admins update" on storage.objects for update using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media: admins delete" on storage.objects;
create policy "media: admins delete" on storage.objects for delete using (bucket_id = 'media' and public.is_admin());

-- ---------- make yourself admin (after signing up in the game once) ----------
-- update public.profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');
