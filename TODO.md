# Viba — TODO

## Setup & Credentials ✅ Done
- [x] Supabase project + schema deployed
- [x] Google OAuth working
- [x] Apple Sign In configured
- [x] Dev build running on iOS simulator
- [x] Avatar upload to Supabase storage
- [x] Profile save (name, username, bio)

---

## Phase 1 — Core Broadcast (MVP) 🔴 Critical

### RTMP / Video Transmission
- [ ] Choose ingest provider: **Mux**, AWS IVS, or Livepeer
- [ ] Install RTMP client (`react-native-rtmp-publisher` or FFmpeg via `react-native-ffmpeg`)
- [ ] New table: `stream_keys (user_id, platform, rtmp_url, stream_key)`
- [ ] Wire CameraView output → RTMP encode → ingest endpoint
- [ ] Handle stream key rotation and expiry

### Platform OAuth (Real)
- [ ] TikTok Login Kit — exchange code for access token, store in Supabase
- [ ] YouTube OAuth 2.0 — `youtube.readonly` + `youtube.upload` scopes
- [ ] Twitch OAuth — `channel:manage:broadcast` scope
- [ ] Instagram / Facebook — Meta Business Login
- [ ] New table: `platform_tokens (user_id, platform, access_token, refresh_token, expires_at)`
- [ ] Token refresh logic before each stream start

### Platform Broadcast API
- [ ] YouTube Live Streaming API — create `liveBroadcast` + `liveStream`, bind, set live
- [ ] Twitch Helix — update channel title + start stream
- [ ] TikTok Live SDK integration (requires developer access approval)
- [ ] Facebook Live Video API — create live video object, get RTMP URL

---

## Phase 2 — Real-Time Data 🟡 Important

### Live Comments
- [ ] YouTube Live Chat API — poll every 2–5 sec while live
- [ ] Twitch EventSub / IRC WebSocket — subscribe to `chat.message`
- [ ] TikTok Live WebSocket feed
- [ ] Aggregate multi-platform comments into unified feed
- [ ] Replace `FAKE_COMMENTS` simulation in `app/(tabs)/live.tsx`

### Live Viewer Counts
- [ ] YouTube `liveBroadcast.snippet.concurrentViewers`
- [ ] Twitch Helix `GET /streams` — `viewer_count`
- [ ] TikTok viewer count from live status endpoint
- [ ] Aggregate + sum viewer counts across platforms
- [ ] Replace random viewer simulation in `app/(tabs)/live.tsx`

### Gifts / Donations
- [ ] TikTok gift events (WebSocket)
- [ ] YouTube Super Chat events (Live Chat API)
- [ ] Twitch Bits + Channel Point redemptions (EventSub)
- [ ] New table: `gift_events (id, stream_session_id, platform, amount_usd, sender, timestamp)`
- [ ] Update `stream_sessions.total_gifts_usd` in real time
- [ ] Fix gift analytics screen to show real data

---

## Phase 3 — Reliability & Production 🟢 Polish

### Error Handling
- [ ] Network drop → auto-reconnect RTMP
- [ ] Per-platform failure isolation (one fails, others keep running)
- [ ] Stream re-entry if app is killed mid-stream
- [ ] Retry logic with exponential backoff

### Backend / Supabase Edge Functions
- [ ] `end-stream` — finalise session stats, trigger payout calc
- [ ] `refresh-platform-token` — background OAuth token refresh
- [ ] Webhook receiver for platform gift/donation events

### Push Notifications (physical device)
- [ ] Milestone viewer notifications (100, 500, 1K, 5K, 10K)
- [ ] Large gift received alert
- [ ] New follower during stream

### Database Additions
```sql
create table stream_keys (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  platform   text not null,
  rtmp_url   text not null,
  stream_key text not null,
  created_at timestamptz default now()
);

create table platform_tokens (
  user_id       uuid references profiles(id) on delete cascade,
  platform      text not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  primary key (user_id, platform)
);

create table gift_events (
  id                uuid primary key default gen_random_uuid(),
  stream_session_id uuid references stream_sessions(id) on delete cascade,
  platform          text not null,
  sender_name       text,
  amount_usd        numeric(10,2) not null,
  gift_name         text,
  timestamp         timestamptz default now()
);
```

---

## Phase 4 — App Store
- [ ] App Store Connect — create app listing
- [ ] Privacy policy URL (required by Apple)
- [ ] Push notification entitlements on physical device
- [ ] TestFlight internal build
- [ ] Google Play Developer account + APK
- [ ] Stream preview thumbnail generation
- [ ] VOD recording toggle
