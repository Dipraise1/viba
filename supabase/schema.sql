create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  username      text unique,
  avatar_url    text,
  push_token    text,
  viba_balance  integer not null default 0,
  bio           text,
  restream_key  text,
  updated_at    timestamptz default now(),
  created_at    timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.stream_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  title           text,
  platform_ids    text[] not null default '{}',
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  duration_secs   integer,
  peak_viewers    integer not null default 0,
  total_gifts_usd numeric(10,2) not null default 0,
  mux_stream_id   text,
  playback_id     text
);

-- Platform OAuth tokens (stored server-side, never exposed to client)
create table if not exists public.platform_tokens (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  platform      text not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  primary key (user_id, platform)
);

-- Individual gift events per stream
create table if not exists public.gift_events (
  id                uuid primary key default gen_random_uuid(),
  stream_session_id uuid not null references public.stream_sessions(id) on delete cascade,
  platform          text not null,
  sender_name       text,
  amount_usd        numeric(10,2) not null default 0,
  gift_name         text,
  timestamp         timestamptz not null default now()
);

create index if not exists stream_sessions_user_id_idx
  on public.stream_sessions (user_id, started_at desc);

alter table public.profiles enable row level security;
alter table public.stream_sessions enable row level security;

create policy "profiles: own row read"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles: own row write"
  on public.profiles for update using (auth.uid() = id);

create policy "sessions: own rows read"
  on public.stream_sessions for select using (auth.uid() = user_id);

create policy "sessions: own rows insert"
  on public.stream_sessions for insert with check (auth.uid() = user_id);

create policy "sessions: own rows update"
  on public.stream_sessions for update using (auth.uid() = user_id);

alter table public.platform_tokens enable row level security;
alter table public.gift_events enable row level security;

create policy "platform_tokens: own rows"
  on public.platform_tokens for all using (auth.uid() = user_id);

create policy "gift_events: own stream read"
  on public.gift_events for select
  using (
    exists (
      select 1 from public.stream_sessions s
      where s.id = stream_session_id and s.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: owner replace"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
