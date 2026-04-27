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

-- ─── Posts status column ────────────────────────────────────────────────────────
alter table posts add column if not exists status text not null default 'published'
  check (status in ('draft', 'published', 'archived'));

-- ─── VBT balances ──────────────────────────────────────────────────────────────
create table if not exists vbt_balances (
  user_id    uuid primary key references profiles on delete cascade,
  balance    bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table vbt_balances enable row level security;
create policy "Users can view their own balance" on vbt_balances for select using (auth.uid() = user_id);
create policy "Users can update their own balance" on vbt_balances for update using (auth.uid() = user_id);

-- ─── Conversations (DMs) ───────────────────────────────────────────────────────
create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table conversations enable row level security;
create policy "Participants can view conversations"
  on conversations for select using (
    exists (select 1 from conversation_participants where conversation_id = id and user_id = auth.uid())
  );

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations on delete cascade,
  user_id         uuid not null references profiles on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);
alter table conversation_participants enable row level security;
create policy "Users can view their own participations"
  on conversation_participants for select using (auth.uid() = user_id);
create policy "System can insert participants"
  on conversation_participants for insert with check (true);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  sender_id       uuid not null references profiles on delete cascade,
  content         text not null,
  created_at      timestamptz not null default now()
);
alter table messages enable row level security;
create policy "Participants can view messages"
  on messages for select using (
    exists (select 1 from conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid())
  );
create policy "Participants can send messages"
  on messages for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid())
  );

-- Auto-update conversation.updated_at when a new message is sent
create or replace function touch_conversation()
returns trigger language plpgsql as $$
begin
  update conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
create or replace trigger on_message_inserted
  after insert on messages for each row execute procedure touch_conversation();

-- Find or create a DM between the caller and another user
create or replace function get_or_create_dm(other_user_id uuid)
returns uuid language plpgsql security definer as $$
declare
  conv_id uuid;
begin
  select cp1.conversation_id into conv_id
  from conversation_participants cp1
  join conversation_participants cp2
    on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = auth.uid() and cp2.user_id = other_user_id
  limit 1;

  if conv_id is null then
    insert into conversations default values returning id into conv_id;
    insert into conversation_participants (conversation_id, user_id)
    values (conv_id, auth.uid()), (conv_id, other_user_id);
  end if;

  return conv_id;
end;
$$;

-- ─── Notifications ──────────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  actor_id   uuid references profiles on delete set null,
  type       text not null check (type in ('like','follow','comment','gift','stream_live')),
  post_id    uuid references posts on delete cascade,
  message    text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "Users can view their own notifications"
  on notifications for select using (auth.uid() = user_id);
create policy "Users can update their own notifications"
  on notifications for update using (auth.uid() = user_id);
create policy "System can insert notifications"
  on notifications for insert with check (true);

-- ─── User status (24-hour expiring) ───────────────────────────────────────────
create table if not exists user_status (
  user_id    uuid primary key references profiles on delete cascade,
  content    text not null,
  is_live    boolean not null default false,
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now()
);
alter table user_status enable row level security;
create policy "Anyone can view active statuses" on user_status for select using (expires_at > now());
create policy "Users can manage their own status" on user_status for all using (auth.uid() = user_id);

-- ─── User stats view ────────────────────────────────────────────────────────────
create or replace view user_stats as
select
  p.id as user_id,
  coalesce(fl.follower_count,  0) as follower_count,
  coalesce(fg.following_count, 0) as following_count,
  coalesce(po.post_count,      0) as post_count,
  coalesce(ss.stream_count,    0) as stream_count
from profiles p
left join (select following_id, count(*) as follower_count  from follows group by following_id) fl on fl.following_id = p.id
left join (select follower_id,  count(*) as following_count from follows group by follower_id)  fg on fg.follower_id  = p.id
left join (select user_id, count(*) filter (where status = 'published') as post_count from posts group by user_id) po on po.user_id = p.id
left join (select user_id, count(*) as stream_count from stream_sessions group by user_id) ss on ss.user_id = p.id;

-- ─── Gift catalog ──────────────────────────────────────────────────────────────
create table if not exists gift_catalog (
  id          text primary key,
  name        text not null,
  emoji       text not null,
  cost_tokens int not null,
  usd_value   numeric(8,4) not null default 0,
  sort_order  int not null default 0
);

insert into gift_catalog (id, name, emoji, cost_tokens, usd_value, sort_order) values
  ('heart',   'Heart',   E'❤️', 2,   0.02, 1),
  ('rose',    'Rose',    E'\U0001F339',   5,   0.05, 2),
  ('star',    'Star',    E'⭐',       10,  0.10, 3),
  ('fire',    'Fire',    E'\U0001F525',   25,  0.25, 4),
  ('diamond', 'Diamond', E'\U0001F48E',   50,  0.50, 5),
  ('crown',   'Crown',   E'\U0001F451',   100, 1.00, 6),
  ('rocket',  'Rocket',  E'\U0001F680',   200, 2.00, 7),
  ('galaxy',  'Galaxy',  E'\U0001F30C',   500, 5.00, 8)
on conflict (id) do nothing;

-- ─── Gift events ───────────────────────────────────────────────────────────────
create table if not exists gift_events (
  id                uuid primary key default gen_random_uuid(),
  stream_session_id uuid references stream_sessions on delete set null,
  sender_id         uuid references profiles on delete set null,
  recipient_id      uuid not null references profiles on delete cascade,
  gift_id           text not null references gift_catalog,
  quantity          int not null default 1,
  tokens_spent      int not null,
  usd_value         numeric(8,4) not null default 0,
  created_at        timestamptz not null default now()
);

alter table gift_events enable row level security;

create policy "Anyone can view gift events"
  on gift_events for select using (true);

create policy "Authenticated users can send gifts"
  on gift_events for insert with check (auth.uid() = sender_id);

-- ─── Realtime enabled for gift events ─────────────────────────────────────────
alter publication supabase_realtime add table gift_events;
