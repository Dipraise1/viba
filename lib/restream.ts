import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

export const RESTREAM_RTMP_URL = 'rtmps://live.restream.io/live';

const RESTREAM_CLIENT_ID = process.env.EXPO_PUBLIC_RESTREAM_CLIENT_ID ?? '';
const REDIRECT_URI = Linking.createURL('restream/callback');

// ─── RTMP helpers ─────────────────────────────────────────────────────────────

export function buildRtmpUrl(streamKey: string): string {
  return `${RESTREAM_RTMP_URL}/${streamKey}`;
}

// ─── OAuth flow ───────────────────────────────────────────────────────────────

/**
 * Opens Restream OAuth in-app browser, exchanges code → tokens via Edge Function,
 * then stores tokens in platform_tokens table.
 * Returns the access token on success.
 */
export async function connectRestream(): Promise<string> {
  const authUrl =
    `https://api.restream.io/login` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(RESTREAM_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
  if (result.type !== 'success') throw new Error('Restream connection cancelled');

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('No OAuth code in callback');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/restream-oauth`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to connect Restream');
  return json.access_token;
}

// ─── Chat WebSocket ────────────────────────────────────────────────────────────

// Restream channel type → our platform id
const CHANNEL_TYPE_MAP: Record<number, string> = {
  1: 'twitch',
  2: 'youtube',
  3: 'facebook',
  6: 'instagram',
  7: 'tiktok',
};

export interface RestreamChatMessage {
  id: string;
  platform: string;
  username: string;
  text: string;
  type: 'comment' | 'follow' | 'gift';
  giftName?: string;
}

export class RestreamChatClient {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(
    accessToken: string,
    onMessage: (msg: RestreamChatMessage) => void,
    onError?: (err: Event) => void
  ) {
    this.ws = new WebSocket(
      `wss://api.restream.io/ws/v2?accessToken=${encodeURIComponent(accessToken)}`
    );

    this.ws.onopen = () => {
      // Keep-alive ping every 30s
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ action: 'ping' }));
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action !== 'event') return;

        const { eventTypeId, payload } = data.payload ?? {};

        if (eventTypeId === 1) {
          // Chat message
          onMessage({
            id: String(payload?.id ?? Date.now()),
            platform: CHANNEL_TYPE_MAP[payload?.channelTypeId] ?? 'youtube',
            username: payload?.author?.displayName ?? 'viewer',
            text: payload?.text ?? '',
            type: 'comment',
          });
        } else if (eventTypeId === 2) {
          // Follow/sub
          onMessage({
            id: String(payload?.id ?? Date.now()),
            platform: CHANNEL_TYPE_MAP[payload?.channelTypeId] ?? 'youtube',
            username: payload?.author?.displayName ?? 'viewer',
            text: '',
            type: 'follow',
          });
        } else if (eventTypeId === 32) {
          // Super chat / gift
          onMessage({
            id: String(payload?.id ?? Date.now()),
            platform: CHANNEL_TYPE_MAP[payload?.channelTypeId] ?? 'youtube',
            username: payload?.author?.displayName ?? 'viewer',
            text: '',
            type: 'gift',
            giftName: payload?.currency
              ? `$${(payload.amount / 100).toFixed(2)}`
              : payload?.name ?? 'Gift',
          });
        }
      } catch { /* ignore malformed frames */ }
    };

    if (onError) this.ws.onerror = onError;
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

// ─── Viewer count polling ─────────────────────────────────────────────────────

/**
 * Fetches total concurrent viewers across all active Restream channels.
 */
export async function fetchRestreamViewers(accessToken: string): Promise<number> {
  try {
    const res = await fetch('https://api.restream.io/v2/user/channel-stats', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    // Sum viewers across all channels
    return (data as any[]).reduce((sum: number, ch: any) => sum + (ch.viewers ?? 0), 0);
  } catch {
    return 0;
  }
}
