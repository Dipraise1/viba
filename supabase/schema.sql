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

-- Allow anyone to read platform name + username (not tokens) for profile display
create policy "Anyone can view connected platform handles"
  on connected_platforms for select using (true);

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
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();

-- ─── Posts ─────────────────────────────────────────────────────────────────────
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles on delete cascade,
  caption       text,
  media_url     text,
  thumbnail_url text,
  duration_secs int,
  tags          text[] not null default '{}',
  stream_id     uuid references stream_sessions on delete set null,
  created_at    timestamptz not null default now()
);

alter table posts enable row level security;

create policy "Anyone can view posts"
  on posts for select using (true);
create policy "Authors can manage their posts"
  on posts for all using (auth.uid() = user_id);

-- ─── Follows ───────────────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id  uuid not null references profiles on delete cascade,
  following_id uuid not null references profiles on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table follows enable row level security;

create policy "Anyone can view follows"
  on follows for select using (true);
create policy "Users can manage their own follows"
  on follows for all using (auth.uid() = follower_id);

-- ─── Post engagements ──────────────────────────────────────────────────────────
create table if not exists post_engagements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  post_id    uuid not null references posts on delete cascade,
  event_type text not null check (event_type in ('view','like','comment','share','save','skip')),
  watch_pct  int check (watch_pct between 0 and 100),
  created_at timestamptz not null default now()
);

alter table post_engagements enable row level security;

create policy "Users can insert their own engagements"
  on post_engagements for insert with check (auth.uid() = user_id);
create policy "Users can read their own engagements"
  on post_engagements for select using (auth.uid() = user_id);

-- ─── User interests ────────────────────────────────────────────────────────────
create table if not exists user_interests (
  user_id    uuid not null references profiles on delete cascade,
  tag        text not null,
  score      float not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, tag)
);

alter table user_interests enable row level security;

create policy "Users can manage their own interests"
  on user_interests for all using (auth.uid() = user_id);

-- ─── Interest upsert helper ────────────────────────────────────────────────────
create or replace function increment_interest(
  p_user_id uuid,
  p_tag     text,
  p_delta   float
) returns void language plpgsql security definer as $$
begin
  insert into user_interests (user_id, tag, score, updated_at)
  values (p_user_id, p_tag, p_delta, now())
  on conflict (user_id, tag) do update
    set score      = user_interests.score + p_delta,
        updated_at = now();
end;
$$;

-- ─── Feed scoring function ─────────────────────────────────────────────────────
create or replace function compute_feed_score(
  p_likes     bigint,
  p_comments  bigint,
  p_shares    bigint,
  p_saves     bigint,
  p_views     bigint,
  p_watch_avg float,
  p_age_hours float
) returns float language sql immutable as $$
  select (
    (p_likes * 3.0 + p_comments * 5.0 + p_shares * 7.0 + p_saves * 4.0
      + p_views * 0.5 + coalesce(p_watch_avg, 0) * p_views * 0.02)
    / greatest(power(p_age_hours + 2.0, 0.8), 1.0)
  );
$$;

-- ─── Ranked feed view ──────────────────────────────────────────────────────────
create or replace view feed_ranked as
with post_stats as (
  select
    post_id,
    count(*)                                            filter (where event_type = 'view')    as views,
    count(*)                                            filter (where event_type = 'like')    as likes,
    count(*)                                            filter (where event_type = 'comment') as comments,
    count(*)                                            filter (where event_type = 'share')   as shares,
    count(*)                                            filter (where event_type = 'save')    as saves,
    avg(watch_pct)                                      filter (where event_type = 'view')    as watch_avg
  from post_engagements
  group by post_id
)
select
  p.id,
  p.user_id,
  p.caption,
  p.media_url,
  p.thumbnail_url,
  p.duration_secs,
  p.tags,
  p.created_at,
  pr.display_name,
  pr.handle,
  pr.avatar_url,
  coalesce(s.views,    0)   as views,
  coalesce(s.likes,    0)   as likes,
  coalesce(s.comments, 0)   as comments,
  coalesce(s.shares,   0)   as shares,
  coalesce(s.saves,    0)   as saves,
  coalesce(s.watch_avg, 0)  as watch_avg,
  extract(epoch from (now() - p.created_at)) / 3600.0 as age_hours,
  compute_feed_score(
    coalesce(s.likes, 0),
    coalesce(s.comments, 0),
    coalesce(s.shares, 0),
    coalesce(s.saves, 0),
    coalesce(s.views, 0),
    coalesce(s.watch_avg, 0),
    extract(epoch from (now() - p.created_at)) / 3600.0
  ) as score
from posts p
join profiles pr on pr.id = p.user_id
left join post_stats s on s.post_id = p.id
where p.created_at > now() - interval '30 days';

-- ─── Trending creators view ────────────────────────────────────────────────────
create or replace view trending_creators as
select
  pr.id,
  pr.handle,
  pr.display_name,
  pr.avatar_url,
  coalesce(f.follower_count, 0)   as follower_count,
  coalesce(ss.stream_count,  0)   as stream_count,
  coalesce(ss.total_viewers, 0)   as total_viewers,
  coalesce(ss.is_live,       false) as is_live,
  ss.last_streamed_at,
  coalesce(cp.platforms,     '{}') as platforms,
  (
    coalesce(e.engagement_24h, 0) * 2.0
    + coalesce(ss.total_viewers,  0) * 1.0
    + coalesce(f.follower_count,  0) * 0.01
  ) as trending_score
from profiles pr
left join (
  select following_id, count(*) as follower_count
  from follows
  group by following_id
) f on f.following_id = pr.id
left join (
  select
    user_id,
    count(*)               as stream_count,
    sum(peak_viewers)      as total_viewers,
    max(case when ended_at is null then true else false end) as is_live,
    max(started_at)        as last_streamed_at
  from stream_sessions
  group by user_id
) ss on ss.user_id = pr.id
left join (
  select po.user_id, count(*) as engagement_24h
  from post_engagements pe
  join posts po on po.id = pe.post_id
  where pe.created_at > now() - interval '24 hours'
  group by po.user_id
) e on e.user_id = pr.id
left join (
  select user_id, array_agg(platform order by connected_at) as platforms
  from connected_platforms
  group by user_id
) cp on cp.user_id = pr.id
order by trending_score desc;
