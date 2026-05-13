import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedPost {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  duration_secs: number | null;
  tags: string[];
  created_at: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watch_avg: number;
  age_hours: number;
  score: number;
}

export interface TrendingCreator {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  stream_count: number;
  total_viewers: number;
  is_live: boolean;
  last_streamed_at: string | null;
  platforms: string[];
  trending_score: number;
}

export type EngagementType = 'view' | 'like' | 'comment' | 'share' | 'save' | 'skip';

// ─── Engagement weights (for interest scoring) ────────────────────────────────

const ENGAGEMENT_WEIGHTS: Record<EngagementType, number> = {
  view:    1,
  like:    5,
  comment: 6,
  share:   7,
  save:    4,
  skip:   -2,
};

// ─── Track a single engagement event ─────────────────────────────────────────

export async function trackEngagement(
  postId: string,
  eventType: EngagementType,
  watchPct?: number,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fire-and-forget insert; don't block the UI
  supabase.from('post_engagements').insert({
    user_id:    user.id,
    post_id:    postId,
    event_type: eventType,
    watch_pct:  watchPct ?? null,
  }).then(() => {});

  // Update interest scores
  const delta = ENGAGEMENT_WEIGHTS[eventType];
  updateInterests(user.id, postId, delta);
}

async function updateInterests(
  userId: string,
  postId: string,
  delta: number,
): Promise<void> {
  const { data: post } = await supabase
    .from('posts')
    .select('tags, user_id')
    .eq('id', postId)
    .single();

  if (!post) return;

  const tags: string[] = [
    ...(post.tags ?? []),
    `creator:${post.user_id}`,
  ];

  await Promise.all(
    tags.map((tag) =>
      supabase.rpc('increment_interest', {
        p_user_id: userId,
        p_tag:     tag,
        p_delta:   delta,
      }),
    ),
  );
}

// ─── Fetch ranked feed ────────────────────────────────────────────────────────

export async function getFeed(
  userId: string,
  page = 0,
  pageSize = 20,
  feedType: 'forYou' | 'following' = 'forYou',
): Promise<FeedPost[]> {
  // Exclude recently seen posts (last 200)
  const { data: seenRows } = await supabase
    .from('post_engagements')
    .select('post_id')
    .eq('user_id', userId)
    .in('event_type', ['view', 'skip'])
    .order('created_at', { ascending: false })
    .limit(200);

  const seenIds = (seenRows ?? []).map((r: { post_id: string }) => r.post_id);

  let query = supabase
    .from('feed_ranked')
    .select('*')
    .order('score', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (seenIds.length) {
    query = query.not('id', 'in', `(${seenIds.join(',')})`);
  }

  if (feedType === 'following') {
    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (!followRows?.length) return [];
    query = query.in('user_id', followRows.map((f: { following_id: string }) => f.following_id));
  }

  const { data } = await query;
  return (data ?? []) as FeedPost[];
}

// ─── Get personalization boost for a creator ─────────────────────────────────
// Returns a multiplier 1.0–3.0 based on how much the user likes this creator

export async function getPersonalizationBoost(
  userId: string,
  creatorId: string,
  tags: string[],
): Promise<number> {
  const interestTags = [`creator:${creatorId}`, ...tags];

  const { data } = await supabase
    .from('user_interests')
    .select('score')
    .eq('user_id', userId)
    .in('tag', interestTags);

  if (!data?.length) return 1.0;

  const total = (data as { score: number }[]).reduce((s, r) => s + r.score, 0);
  // Clamp between 1.0 and 3.0; every 20 points of interest = +0.1 boost
  return Math.min(3.0, 1.0 + total / 200);
}

// ─── Follows ──────────────────────────────────────────────────────────────────

export async function followCreator(
  followerId: string,
  followingId: string,
): Promise<void> {
  await supabase
    .from('follows')
    .upsert({ follower_id: followerId, following_id: followingId });
}

export async function unfollowCreator(
  followerId: string,
  followingId: string,
): Promise<void> {
  await supabase
    .from('follows')
    .delete()
    .match({ follower_id: followerId, following_id: followingId });
}

export async function checkIsFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .match({ follower_id: followerId, following_id: followingId })
    .maybeSingle();
  return !!data;
}

export async function getFollowerCount(creatorId: string): Promise<number> {
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', creatorId);
  return count ?? 0;
}

// ─── Publish a post ──────────────────────────────────────────────────────────

export async function publishPost(params: {
  videoUri: string;
  thumbnailUri: string | null;
  caption: string;
  durationMs: number | null;
  tags?: string[];
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to post.');

  const fileSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ext = params.videoUri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'mp4';
  const videoPath = `${user.id}/posts/${fileSuffix}.${ext}`;

  const videoBlob = await fetch(params.videoUri).then((r) => r.blob());
  const { error: videoError } = await supabase.storage
    .from('videos')
    .upload(videoPath, videoBlob, { upsert: false, contentType: `video/${ext}` });
  if (videoError) throw videoError;

  const { data: { publicUrl: mediaUrl } } = supabase.storage.from('videos').getPublicUrl(videoPath);

  let thumbnailUrl: string | null = null;
  if (params.thumbnailUri) {
    const thumbPath = `${user.id}/posts/${fileSuffix}_thumb.jpg`;
    const thumbBlob = await fetch(params.thumbnailUri).then((r) => r.blob());
    const { error: thumbError } = await supabase.storage
      .from('videos')
      .upload(thumbPath, thumbBlob, { upsert: false, contentType: 'image/jpeg' });
    if (!thumbError) {
      thumbnailUrl = supabase.storage.from('videos').getPublicUrl(thumbPath).data.publicUrl;
    }
  }

  const { data, error: insertError } = await supabase
    .from('posts')
    .insert({
      user_id:       user.id,
      caption:       params.caption || null,
      media_url:     mediaUrl,
      thumbnail_url: thumbnailUrl,
      duration_secs: params.durationMs ? Math.round(params.durationMs / 1000) : null,
      tags:          params.tags ?? [],
      status:        'published',
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return (data as { id: string }).id;
}

// ─── Trending creators ────────────────────────────────────────────────────────

export async function getTrendingCreators(
  excludeId?: string,
  limit = 30,
): Promise<TrendingCreator[]> {
  let query = supabase
    .from('trending_creators')
    .select('*')
    .order('trending_score', { ascending: false })
    .limit(limit);

  if (excludeId) query = query.neq('id', excludeId);

  const { data } = await query;
  return (data ?? []) as TrendingCreator[];
}
