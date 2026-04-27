import { supabase } from '@/lib/supabase';

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  costTokens: number;
  usdValue: number;
}

export const GIFT_CATALOG: GiftItem[] = [
  { id: 'heart',   name: 'Heart',   emoji: '❤️',  costTokens: 2,   usdValue: 0.02 },
  { id: 'rose',    name: 'Rose',    emoji: '🌹',  costTokens: 5,   usdValue: 0.05 },
  { id: 'star',    name: 'Star',    emoji: '⭐',  costTokens: 10,  usdValue: 0.10 },
  { id: 'fire',    name: 'Fire',    emoji: '🔥',  costTokens: 25,  usdValue: 0.25 },
  { id: 'diamond', name: 'Diamond', emoji: '💎',  costTokens: 50,  usdValue: 0.50 },
  { id: 'crown',   name: 'Crown',   emoji: '👑',  costTokens: 100, usdValue: 1.00 },
  { id: 'rocket',  name: 'Rocket',  emoji: '🚀',  costTokens: 200, usdValue: 2.00 },
  { id: 'galaxy',  name: 'Galaxy',  emoji: '🌌',  costTokens: 500, usdValue: 5.00 },
];

export function getGift(id: string): GiftItem {
  return GIFT_CATALOG.find((g) => g.id === id) ?? { id, name: id, emoji: '🎁', costTokens: 10, usdValue: 0.10 };
}

export interface GiftEventRow {
  id: string;
  giftId: string;
  giftName: string;
  giftEmoji: string;
  senderHandle: string;
  quantity: number;
  tokensSpent: number;
  usdValue: number;
  createdAt: string;
}

export interface GiftBreakdownItem {
  giftId: string;
  name: string;
  emoji: string;
  count: number;
  tokens: number;
  usdValue: number;
}

export interface GiftAnalytics {
  totalTokens: number;
  totalUsd: number;
  totalCount: number;
  breakdown: GiftBreakdownItem[];
}

export type GiftPeriod = 'today' | 'week' | 'month' | 'all';

function periodStart(period: GiftPeriod): string | null {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString();
  }
  if (period === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString();
  }
  return null;
}

export async function fetchGiftAnalytics(userId: string, period: GiftPeriod): Promise<GiftAnalytics> {
  let query = supabase
    .from('gift_events')
    .select('gift_id, quantity, tokens_spent, usd_value')
    .eq('recipient_id', userId);

  const start = periodStart(period);
  if (start) query = query.gte('created_at', start);

  const { data, error } = await query;
  if (error || !data) return { totalTokens: 0, totalUsd: 0, totalCount: 0, breakdown: [] };

  const totals: Record<string, { count: number; tokens: number; usdValue: number }> = {};
  let totalTokens = 0, totalUsd = 0, totalCount = 0;

  for (const row of data) {
    const gid = row.gift_id as string;
    if (!totals[gid]) totals[gid] = { count: 0, tokens: 0, usdValue: 0 };
    totals[gid].count += row.quantity as number;
    totals[gid].tokens += row.tokens_spent as number;
    totals[gid].usdValue += Number(row.usd_value) * (row.quantity as number);
    totalTokens += row.tokens_spent as number;
    totalUsd += Number(row.usd_value) * (row.quantity as number);
    totalCount += row.quantity as number;
  }

  const breakdown: GiftBreakdownItem[] = Object.entries(totals)
    .map(([giftId, stats]) => ({ giftId, name: getGift(giftId).name, emoji: getGift(giftId).emoji, ...stats }))
    .sort((a, b) => b.tokens - a.tokens);

  return { totalTokens, totalUsd, totalCount, breakdown };
}

export async function fetchRecentGifts(userId: string, limit = 20): Promise<GiftEventRow[]> {
  const { data, error } = await supabase
    .from('gift_events')
    .select('id, gift_id, quantity, tokens_spent, usd_value, created_at, sender:profiles!sender_id(display_name, handle)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const gift = getGift(row.gift_id);
    const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
    return {
      id: row.id,
      giftId: row.gift_id,
      giftName: gift.name,
      giftEmoji: gift.emoji,
      senderHandle: sender?.display_name ?? sender?.handle ?? 'anonymous',
      quantity: row.quantity,
      tokensSpent: row.tokens_spent,
      usdValue: Number(row.usd_value) * row.quantity,
      createdAt: row.created_at,
    } as GiftEventRow;
  });
}

export async function sendGift(params: {
  streamSessionId: string | null;
  recipientId: string;
  giftId: string;
  quantity: number;
  spendTokensFn: (amount: number, label: string) => boolean;
}): Promise<boolean> {
  const { streamSessionId, recipientId, giftId, quantity, spendTokensFn } = params;
  const gift = getGift(giftId);
  const totalCost = gift.costTokens * quantity;

  const ok = spendTokensFn(totalCost, `Sent ${quantity}x ${gift.name}`);
  if (!ok) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('gift_events').insert({
    stream_session_id: streamSessionId,
    sender_id: user.id,
    recipient_id: recipientId,
    gift_id: giftId,
    quantity,
    tokens_spent: totalCost,
    usd_value: gift.usdValue,
  });

  return !error;
}

export function subscribeToStreamGifts(
  streamSessionId: string,
  onGift: (event: GiftEventRow & { tokensEarned: number }) => void
) {
  return supabase
    .channel(`gifts_stream_${streamSessionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'gift_events', filter: `stream_session_id=eq.${streamSessionId}` },
      (payload) => {
        const row = payload.new as any;
        const gift = getGift(row.gift_id);
        onGift({
          id: row.id,
          giftId: row.gift_id,
          giftName: gift.name,
          giftEmoji: gift.emoji,
          senderHandle: 'viewer',
          quantity: row.quantity,
          tokensSpent: row.tokens_spent,
          usdValue: Number(row.usd_value) * row.quantity,
          createdAt: row.created_at,
          tokensEarned: row.tokens_spent,
        });
      }
    )
    .subscribe();
}
