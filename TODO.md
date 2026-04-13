# Viba — TODO

## Credentials needed

### Supabase
- [ ] Create project at https://supabase.com
- [ ] Copy **Project URL** → paste into `.env` as `EXPO_PUBLIC_SUPABASE_URL`
- [ ] Copy **anon/public key** → paste into `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Create storage bucket named `avatars` (set to public) in Supabase → Storage

### Google OAuth (for "Continue with Google")
- [ ] Go to https://console.cloud.google.com
- [ ] Create a new project (or use existing)
- [ ] APIs & Services → Credentials → Create OAuth 2.0 Client ID → iOS
- [ ] Add your Supabase callback URL (shown in Supabase → Auth → Providers → Google)
- [ ] Enable Google provider in Supabase → Auth → Providers → Google
- [ ] Paste the Google Client ID + Secret into Supabase

### Apple Sign In (iOS only)
- [ ] Enroll in Apple Developer Program at https://developer.apple.com
- [ ] Enable "Sign in with Apple" capability in your App ID
- [ ] Enable Apple provider in Supabase → Auth → Providers → Apple
- [ ] Add Apple Service ID + key to Supabase

### Push Notifications
- [ ] Build a development client: `npx expo run:ios` or `npx expo run:android`
- [ ] Test on a real device (push notifications don't work in simulator)

## Next features to build
- [ ] Real RTMP streaming (replace camera preview with Agora SDK or api.video)
- [ ] YouTube OAuth — fetch real stream key via YouTube Live Streaming API
- [ ] Twitch OAuth — fetch real stream key via Twitch API
- [ ] Facebook/Instagram Live API connection
- [ ] TikTok LIVE Kit (requires applying for access at developers.tiktok.com)
- [ ] Real comment ingestion (Twitch IRC WebSocket, YouTube Live Chat API polling)
- [ ] App Store submission (Apple + Google Play)
