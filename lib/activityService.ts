import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'like' | 'follow' | 'comment' | 'gift' | 'stream_live';

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  actor?: { display_name: string; handle: string; avatar_url: string | null };
}

export interface UserStatus {
  user_id: string;
  content: string;
  is_live: boolean;
  expires_at: string;
  created_at: string;
  profile?: { display_name: string; handle: string; avatar_url: string | null };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(display_name, handle, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
}

// ─── User statuses ────────────────────────────────────────────────────────────

export async function getFollowingStatuses(): Promise<UserStatus[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get IDs of people current user follows
  const { data: followRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds = (followRows ?? []).map((f: { following_id: string }) => f.following_id);
  if (!followingIds.length) return [];

  const { data } = await supabase
    .from('user_status')
    .select('*, profile:profiles!user_id(display_name, handle, avatar_url)')
    .in('user_id', followingIds)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return (data ?? []) as UserStatus[];
}

// ─── Set / clear own status ───────────────────────────────────────────────────

export async function setStatus(content: string, isLive = false): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_status').upsert({
    user_id: user.id,
    content,
    is_live: isLive,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  });
}

export async function clearStatus(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_status').delete().eq('user_id', user.id);
}

// ─── Create a notification (called internally when actions happen) ────────────

export async function createNotification(
  recipientId: string,
  type: NotificationType,
  message?: string,
  postId?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id === recipientId) return; // don't notify yourself
  await supabase.from('notifications').insert({
    user_id:  recipientId,
    actor_id: user.id,
    type,
    post_id:  postId ?? null,
    message:  message ?? null,
  });
}
