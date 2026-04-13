import { supabase } from './supabase';
import { PlatformId } from '@/constants/platforms';

export interface StreamSession {
  id: string;
  title: string | null;
  platform_ids: string[];
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  peak_viewers: number;
  total_gifts_usd: number;
}

export async function startStreamSession(
  title: string,
  platformIds: PlatformId[]
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('stream_sessions')
    .insert({
      user_id: user.id,
      title: title || null,
      platform_ids: platformIds,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to start session:', error.message);
    return null;
  }

  return data.id;
}

export async function endStreamSession(
  sessionId: string,
  durationSecs: number,
  peakViewers: number
): Promise<void> {
  await supabase
    .from('stream_sessions')
    .update({
      ended_at: new Date().toISOString(),
      duration_secs: durationSecs,
      peak_viewers: peakViewers,
    })
    .eq('id', sessionId);
}

export async function fetchRecentStreams(limit = 10): Promise<StreamSession[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('stream_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch streams:', error.message);
    return [];
  }

  return data ?? [];
}

export async function fetchStreamStats(): Promise<{
  totalStreams: number;
  totalViewers: number;
  totalEarnedUsd: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalStreams: 0, totalViewers: 0, totalEarnedUsd: 0 };

  const { data } = await supabase
    .from('stream_sessions')
    .select('peak_viewers, total_gifts_usd')
    .eq('user_id', user.id)
    .not('ended_at', 'is', null);

  if (!data) return { totalStreams: 0, totalViewers: 0, totalEarnedUsd: 0 };

  return {
    totalStreams: data.length,
    totalViewers: data.reduce((sum, s) => sum + (s.peak_viewers ?? 0), 0),
    totalEarnedUsd: data.reduce((sum, s) => sum + parseFloat(s.total_gifts_usd ?? '0'), 0),
  };
}
