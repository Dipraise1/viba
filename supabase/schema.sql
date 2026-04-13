-- Run this in your Supabase project: SQL Editor → New query → paste & run

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Creator',
  handle       text not null default '@creator',
  bio          text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Creator'),
    '@' || lower(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', 'creator'), '[^a-z0-9]', '', 'g'))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Connected platforms ───────────────────────────────────────────────────────
create table if not exists connected_platforms (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references profiles on delete cascade,
  platform           text not null check (platform in ('tiktok','instagram','facebook','youtube','twitch')),
  platform_user_id   text,
  username           text,
  oauth_token        text,      -- store encrypted in production
  oauth_refresh_token text,
  token_expires_at   timestamptz,
  connected_at       timestamptz not null default now(),
  unique(user_id, platform)
);

alter table connected_platforms enable row level security;

create policy "Users can manage their own platform connections"
  on connected_platforms for all using (auth.uid() = user_id);

-- ─── Push token column ────────────────────────────────────────────────────────
alter table profiles add column if not exists push_token text;
alter table profiles add column if not exists avatar_url text;

-- ─── Avatars storage bucket ───────────────────────────────────────────────────
-- Run in Supabase Storage dashboard: create a bucket named "avatars" (public)
-- Or run this SQL:
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Stream sessions ───────────────────────────────────────────────────────────
create table if not exists stream_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles on delete cascade,
  title           text,
  platform_ids    text[] not null default '{}',
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_secs   int,
  peak_viewers    int not null default 0,
  total_gifts_usd numeric(10,2) not null default 0
);

alter table stream_sessions enable row level security;

create policy "Users can manage their own streams"
  on stream_sessions for all using (auth.uid() = user_id);
