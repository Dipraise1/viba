import { supabase } from '@/lib/supabase';

export interface MuxStreamInfo {
  rtmp_url: string;
  stream_key: string;
  mux_stream_id: string;
  playback_id: string | null;
}

/**
 * Calls the Supabase Edge Function to create a Mux live stream.
 * Returns the RTMP URL + stream key to push to.
 */
export async function createMuxStream(sessionId: string): Promise<MuxStreamInfo> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-mux-stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    }
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to create Mux stream');
  return json as MuxStreamInfo;
}

/**
 * Disables a Mux live stream (stops ingest, triggers VOD archiving).
 */
export async function endMuxStream(muxStreamId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/end-mux-stream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mux_stream_id: muxStreamId }),
    }
  );
}

/**
 * Returns the HLS playback URL for a Mux playback ID.
 */
export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}
