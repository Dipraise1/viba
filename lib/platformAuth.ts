import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// ─── Platform RTMP endpoints ──────────────────────────────────────────────────

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

// ─── OAuth configs ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const YOUTUBE_CLIENT_ID  = process.env.EXPO_PUBLIC_YOUTUBE_CLIENT_ID  ?? '';
const TWITCH_CLIENT_ID   = process.env.EXPO_PUBLIC_TWITCH_CLIENT_ID   ?? '';
const FACEBOOK_APP_ID    = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID    ?? '';

// Deep-link redirect back to Viba after OAuth
function redirectUri(platform: string) {
  return Linking.createURL(`${platform}/callback`);
}

// ─── YouTube ──────────────────────────────────────────────────────────────────

export async function connectYouTube(): Promise<{ streamKey: string; username?: string }> {
  const redirect = redirectUri('youtube');
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${encodeURIComponent(YOUTUBE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
  if (result.type !== 'success') throw new Error('YouTube connection cancelled');

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('No OAuth code returned from YouTube');

  return callPlatformFunction('youtube-oauth', { code, redirect_uri: redirect });
}

// ─── Twitch ───────────────────────────────────────────────────────────────────

export async function connectTwitch(): Promise<{ streamKey: string; username?: string }> {
  const redirect = redirectUri('twitch');
  const authUrl =
    'https://id.twitch.tv/oauth2/authorize' +
    `?client_id=${encodeURIComponent(TWITCH_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('channel:read:stream_key')}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
  if (result.type !== 'success') throw new Error('Twitch connection cancelled');

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('No OAuth code returned from Twitch');

  return callPlatformFunction('twitch-oauth', { code, redirect_uri: redirect });
}

// ─── Facebook ─────────────────────────────────────────────────────────────────

export async function connectFacebook(): Promise<{ streamKey: string; username?: string }> {
  const redirect = redirectUri('facebook');
  const authUrl =
    'https://www.facebook.com/v19.0/dialog/oauth' +
    `?client_id=${encodeURIComponent(FACEBOOK_APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('publish_video,pages_read_engagement')}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
  if (result.type !== 'success') throw new Error('Facebook connection cancelled');

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('No OAuth code returned from Facebook');

  return callPlatformFunction('facebook-oauth', { code, redirect_uri: redirect });
}

// ─── Shared Edge Function caller ──────────────────────────────────────────────

async function callPlatformFunction(
  fnName: string,
  body: Record<string, string>
): Promise<{ streamKey: string; username?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Failed to connect platform`);
  return { streamKey: json.stream_key ?? '', username: json.username };
}

// ─── Disconnect platform ──────────────────────────────────────────────────────

export async function disconnectPlatform(platform: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('platform_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform);
}
