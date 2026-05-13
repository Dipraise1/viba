-- ─── platform_connections ─────────────────────────────────────────────────────
-- Replaces: platform_tokens + connected_platforms + profiles.stream_keys

create table if not exists platform_connections (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references profiles(id) on delete cascade,
  platform         text        not null,           -- 'youtube' | 'twitch' | 'facebook' | 'restream' | 'tiktok' | 'instagram'
  platform_uid     text,                           -- user's ID on that platform
  username         text,                           -- display name / handle
  access_token     text,
  refresh_token    text,
  stream_key       text,
  scopes           text[],
  expires_at       timestamptz,
  status           text        not null default 'active',  -- 'active' | 'expired' | 'revoked'
  via_restream     boolean     not null default false,     -- TikTok / Instagram route through Restream
  last_verified_at timestamptz,
  connected_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, platform)
);

alter table platform_connections enable row level security;

create policy "Users read own connections"
  on platform_connections for select
  using (auth.uid() = user_id);

create policy "Users delete own connections"
  on platform_connections for delete
  using (auth.uid() = user_id);

-- Insert/update only via service role (Edge Functions)

-- ─── oauth_states ─────────────────────────────────────────────────────────────
-- Short-lived CSRF state tokens for the OAuth dance

create table if not exists oauth_states (
  state      text        primary key,
  user_id    uuid        not null references profiles(id) on delete cascade,
  platform   text        not null,
  created_at timestamptz not null default now()
);

alter table oauth_states enable row level security;

-- Client inserts its own state; Edge Functions use service role to read/delete
create policy "Users insert own oauth states"
  on oauth_states for insert
  with check (auth.uid() = user_id);

-- Auto-expire states older than 15 minutes via scheduled cleanup
-- (Add this pg_cron job in Supabase dashboard → SQL Editor)
-- select cron.schedule('expire-oauth-states', '*/15 * * * *',
--   $$delete from oauth_states where created_at < now() - interval '15 minutes'$$);

-- ─── Migrate existing data (conditional — skipped if source tables don't exist) ──

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'connected_platforms') then
    insert into platform_connections (user_id, platform, username, status, via_restream)
    select
      cp.user_id,
      cp.platform,
      cp.username,
      'active',
      (cp.platform in ('tiktok', 'instagram'))
    from connected_platforms cp
    on conflict (user_id, platform) do nothing;
  end if;

  if exists (select 1 from information_schema.tables where table_name = 'platform_tokens') then
    insert into platform_connections (
      user_id, platform, access_token, refresh_token, expires_at, status, via_restream
    )
    select
      pt.user_id,
      pt.platform,
      pt.access_token,
      pt.refresh_token,
      pt.expires_at,
      case
        when pt.expires_at is not null and pt.expires_at < now() then 'expired'
        else 'active'
      end,
      false
    from platform_tokens pt
    where pt.platform != 'restream'
    on conflict (user_id, platform) do update
      set access_token  = excluded.access_token,
          refresh_token = excluded.refresh_token,
          expires_at    = excluded.expires_at,
          status        = excluded.status;
  end if;
end $$;
