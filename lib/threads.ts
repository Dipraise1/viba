import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Thread {
  id: string;
  user_id: string;
  body: string;
  tags: string[];
  created_at: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  likes: number;
  replies: number;
  reposts: number;
  liked?: boolean;
  reposted?: boolean;
  bookmarked?: boolean;
}

export interface DbThreadReply {
  id: string;
  thread_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name: string;
  handle: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function attachUserState(
  threads: Thread[],
  userId: string,
): Promise<Thread[]> {
  if (!threads.length) return threads;
  const ids = threads.map((t) => t.id);

  const [likesRes, repostsRes, bookmarksRes] = await Promise.all([
    supabase.from('thread_likes').select('thread_id').eq('user_id', userId).in('thread_id', ids),
    supabase.from('thread_reposts').select('thread_id').eq('user_id', userId).in('thread_id', ids),
    supabase.from('thread_bookmarks').select('thread_id').eq('user_id', userId).in('thread_id', ids),
  ]);

  const liked     = new Set((likesRes.data     ?? []).map((r: any) => r.thread_id));
  const reposted  = new Set((repostsRes.data   ?? []).map((r: any) => r.thread_id));
  const bookmarked = new Set((bookmarksRes.data ?? []).map((r: any) => r.thread_id));

  return threads.map((t) => ({
    ...t,
    liked:      liked.has(t.id),
    reposted:   reposted.has(t.id),
    bookmarked: bookmarked.has(t.id),
  }));
}

// ─── Fetch global thread feed ─────────────────────────────────────────────────

export async function getThreadFeed(limit = 30): Promise<Thread[]> {
  const { data, error } = await supabase
    .from('thread_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (user) return attachUserState(data as Thread[], user.id);
  return data as Thread[];
}

// ─── Fetch threads for a specific user profile ────────────────────────────────

export async function getUserThreads(
  profileUserId: string,
  currentUserId?: string,
): Promise<Thread[]> {
  const { data, error } = await supabase
    .from('thread_feed')
    .select('*')
    .eq('user_id', profileUserId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data?.length) return [];
  if (currentUserId) return attachUserState(data as Thread[], currentUserId);
  return data as Thread[];
}

// ─── Post a new thread ────────────────────────────────────────────────────────

export async function postThread(body: string, tags: string[] = []): Promise<Thread | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: inserted, error } = await supabase
    .from('threads')
    .insert({ user_id: user.id, body: body.trim(), tags })
    .select('id')
    .single();

  if (error || !inserted) return null;

  const { data: full } = await supabase
    .from('thread_feed')
    .select('*')
    .eq('id', inserted.id)
    .single();

  return (full as Thread) ?? null;
}

// ─── Toggle like ──────────────────────────────────────────────────────────────

export async function toggleThreadLike(threadId: string, currentlyLiked: boolean): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return currentlyLiked;

  if (currentlyLiked) {
    await supabase.from('thread_likes').delete().match({ user_id: user.id, thread_id: threadId });
    return false;
  }
  await supabase.from('thread_likes').upsert({ user_id: user.id, thread_id: threadId });
  return true;
}

// ─── Toggle repost ────────────────────────────────────────────────────────────

export async function toggleThreadRepost(threadId: string, currentlyReposted: boolean): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return currentlyReposted;

  if (currentlyReposted) {
    await supabase.from('thread_reposts').delete().match({ user_id: user.id, thread_id: threadId });
    return false;
  }
  await supabase.from('thread_reposts').upsert({ user_id: user.id, thread_id: threadId });
  return true;
}

// ─── Toggle bookmark ──────────────────────────────────────────────────────────

export async function toggleThreadBookmark(threadId: string, currentlyBookmarked: boolean): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return currentlyBookmarked;

  if (currentlyBookmarked) {
    await supabase.from('thread_bookmarks').delete().match({ user_id: user.id, thread_id: threadId });
    return false;
  }
  await supabase.from('thread_bookmarks').upsert({ user_id: user.id, thread_id: threadId });
  return true;
}

// ─── Post a reply ─────────────────────────────────────────────────────────────

export async function postThreadReply(threadId: string, body: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('thread_replies')
    .insert({ thread_id: threadId, user_id: user.id, body: body.trim() });

  return !error;
}

// ─── Get replies for a thread ─────────────────────────────────────────────────

export async function getThreadReplies(threadId: string): Promise<DbThreadReply[]> {
  const { data } = await supabase
    .from('thread_replies')
    .select('*, profiles!thread_replies_user_id_fkey(display_name, handle)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(10);

  return (data ?? []).map((r: any) => ({
    id:           r.id,
    thread_id:    r.thread_id,
    user_id:      r.user_id,
    body:         r.body,
    created_at:   r.created_at,
    display_name: r.profiles?.display_name ?? 'User',
    handle:       r.profiles?.handle ?? '@user',
  }));
}
