# Platform OAuth Setup

## Overview
Viba connects directly to YouTube, Twitch, and Facebook — no Restream account needed.
TikTok and Instagram still route through Restream (their live APIs are partner-only).

---

## YouTube

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services → Credentials**
3. **Create OAuth 2.0 Client ID** → type: iOS (or Web for testing)
4. Add authorized redirect URI: `viba://youtube/callback`
5. Enable **YouTube Data API v3** in the library_
6. Copy **Client ID** → `.env`: `EXPO_PUBLIC_YOUTUBE_CLIENT_ID=`
7. Copy **Client Secret** → Supabase Edge Function secrets:
   ```
   supabase secrets set YOUTUBE_CLIENT_ID=xxx YOUTUBE_CLIENT_SECRET=xxx
   ```

---

## Twitch

1. Go to [dev.twitch.tv/console](https://dev.twitch.tv/console)
2. **Register Your Application**
3. OAuth Redirect URL: `viba://twitch/callback`
4. Category: **Broadcasting Suite**
5. Copy **Client ID** → `.env`: `EXPO_PUBLIC_TWITCH_CLIENT_ID=`
6. Generate a **New Secret** → Supabase:
   ```
   supabase secrets set TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=xxx
   ```

---

## Facebook

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. **Create App** → type: **Business**
3. Add **Facebook Login** product
4. Valid OAuth Redirect URI: `viba://facebook/callback`
5. Required permissions: `publish_video`, `pages_read_engagement`
6. Copy **App ID** → `.env`: `EXPO_PUBLIC_FACEBOOK_APP_ID=`
7. Copy **App Secret** → Supabase:
   ```
   supabase secrets set FACEBOOK_APP_ID=xxx FACEBOOK_APP_SECRET=xxx
   ```

---

## Deploy Edge Functions

```bash
supabase functions deploy youtube-oauth
supabase functions deploy twitch-oauth
supabase functions deploy facebook-oauth
supabase functions deploy restream-oauth
```

---

## Run SQL Migration

Run this in Supabase SQL editor:

```sql
alter table public.profiles
  add column if not exists stream_keys jsonb default '{}';

create table if not exists public.connected_platforms (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  platform  text not null,
  username  text,
  primary key (user_id, platform)
);

alter table public.connected_platforms enable row level security;

create policy "connected_platforms: own rows"
  on public.connected_platforms for all using (auth.uid() = user_id);
```
