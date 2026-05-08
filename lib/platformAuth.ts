import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL       = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const YOUTUBE_CLIENT_ID  = process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID ?? '';
const TWITCH_CLIENT_ID   = process.env.EXPO_PUBLIC_TWITCH_CLIENT_ID ?? '';
const FACEBOOK_APP_ID    = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
const RESTREAM_CLIENT_ID = process.env.EXPO_PUBLIC_RESTREAM_CLIENT_ID ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DirectPlatform = 'youtube' | 'twitch' | 'facebook' | 'restream';

export interface PlatformConnectionRow {
  platform: string;
  username: string | null;
  status: 'active' | 'expired' | 'revoked';
  stream_key: string | null;
  via_restream: boolean;
  connected_at: string;
}

// ─── RTMP helpers ─────────────────────────────────────────────────────────────

export const PLATFORM_RTMP_BASES: Record<string, string> = {
  youtube:  'rtmp://a.rtmp.youtube.com/live2',
  twitch:   'rtmps://live.twitch.tv/app',
  facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
};

export function buildPlatformRtmpUrl(platform: string, streamKey: string): string {
  const base = PLATFORM_RTMP_BASES[platform];
  if (!base) throw new Error(`No RTMP base for platform: ${platform}`);
  return `${base}/${streamKey}`;
}

// ─── OAuth URL builders ───────────────────────────────────────────────────────

function deepLink(platform: string) {
  return Linking.createURL(`oauth/${platform}`);
}

function generateState(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildAuthUrl(platform: DirectPlatform, redirect: string, state: string): string {
  const p = new URLSearchParams();

  if (platform === 'youtube') {
    p.set('client_id', YOUTUBE_CLIENT_ID);
    p.set('redirect_uri', redirect);
    p.set('response_type', 'code');
    p.set('scope', 'https://www.googleapis.com/auth/youtube');
    p.set('access_type', 'offline');
    p.set('prompt', 'consent');
    p.set('state', state);
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }

  if (platform === 'twitch') {
    p.set('client_id', TWITCH_CLIENT_ID);
    p.set('redirect_uri', redirect);
    p.set('response_type', 'code');
    p.set('scope', 'channel:read:stream_key');
    p.set('state', state);
    return `https://id.twitch.tv/oauth2/authorize?${p}`;
  }

  if (platform === 'facebook') {
    p.set('client_id', FACEBOOK_APP_ID);
    p.set('redirect_uri', redirect);
    p.set('response_type', 'code');
    p.set('scope', 'publish_video,pages_read_engagement');
    p.set('state', state);
    return `https://www.facebook.com/v19.0/dialog/oauth?${p}`;
  }

  if (platform === 'restream') {
    p.set('client_id', RESTREAM_CLIENT_ID);
    p.set('redirect_uri', redirect);
    p.set('response_type', 'code');
    p.set('state', state);
    return `https://api.restream.io/login?${p}`;
  }

  throw new Error(`Unknown platform: ${platform}`);
}

// ─── Connect ──────────────────────────────────────────────────────────────────

export async function connectPlatform(
  platform: DirectPlatform
): Promise<{ username?: string; streamKey?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const redirect = deepLink(platform);
  const state    = generateState();

  // Store state for CSRF validation (one-time, expires via pg_cron)
  await supabase.from('oauth_states').insert({ state, user_id: session.user.id, platform });

  const authUrl = buildAuthUrl(platform, redirect, state);
  const result  = await WebBrowser.openAuthSessionAsync(authUrl, redirect);

  if (result.type !== 'success') {
    await supabase.from('oauth_states').delete().eq('state', state);
    throw new Error(`${platform} connection cancelled`);
  }

  const url           = new URL(result.url);
  const code          = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (!code) throw new Error(`No code returned from ${platform}`);
  if (returnedState !== state) throw new Error('State mismatch — possible CSRF attack');

  // Hand off to the unified Edge Function
  const res = await fetch(`${SUPABASE_URL}/functions/v1/platform-oauth-callback`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ platform, code, redirect_uri: redirect, state }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Failed to connect ${platform}`);

  return { username: json.username, streamKey: json.stream_key };
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export async function disconnectPlatform(platform: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('platform_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform);

  // Also clean up legacy tables in case they still exist
  await supabase
    .from('platform_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform);
}

// ─── Load connections ─────────────────────────────────────────────────────────

export async function loadPlatformConnections(userId: string): Promise<PlatformConnectionRow[]> {
  const { data } = await supabase
    .from('platform_connections')
    .select('platform, username, status, stream_key, via_restream, connected_at')
    .eq('user_id', userId);
  return (data ?? []) as PlatformConnectionRow[];
}

// ─── Realtime subscription ────────────────────────────────────────────────────

export function subscribeToPlatformChanges(
  userId: string,
  onChange: () => void
) {
  return supabase
    .channel(`platform_connections:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'platform_connections', filter: `user_id=eq.${userId}` },
      onChange
    )
    .subscribe();
}
