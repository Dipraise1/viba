import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: { display_name: string; handle: string; avatar_url: string | null };
}

export interface ConversationPreview {
  conversation_id: string;
  other_user_id: string;
  other_name: string;
  other_handle: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  last_read_at: string | null;
  has_unread: boolean;
}

// ─── Get or create DM conversation ───────────────────────────────────────────

export async function getOrCreateDm(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm', { other_user_id: otherUserId });
  if (error) throw error;
  return data as string;
}

// ─── Fetch messages for a conversation ───────────────────────────────────────

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(display_name, handle, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

// ─── Send a message ───────────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, content })
    .select('*, sender:profiles!sender_id(display_name, handle, avatar_url)')
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

// ─── Subscribe to new messages in a conversation ─────────────────────────────

export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      async (payload) => {
        // Fetch with sender profile attached
        const { data } = await supabase
          .from('messages')
          .select('*, sender:profiles!sender_id(display_name, handle, avatar_url)')
          .eq('id', payload.new.id)
          .single();
        if (data) onMessage(data as ChatMessage);
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ─── Mark conversation as read ────────────────────────────────────────────────

export async function markConversationRead(conversationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .match({ conversation_id: conversationId, user_id: user.id });
}

// ─── Fetch conversation list for current user ─────────────────────────────────

export async function getConversations(): Promise<ConversationPreview[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all conversations I'm part of
  const { data: myParts } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id);

  if (!myParts?.length) return [];

  const convIds = myParts.map((p) => p.conversation_id);
  const lastReadMap: Record<string, string | null> = {};
  myParts.forEach((p) => { lastReadMap[p.conversation_id] = p.last_read_at; });

  // Get the other participant in each conversation
  const { data: otherParts } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id, profiles:profiles!user_id(display_name, handle, avatar_url)')
    .in('conversation_id', convIds)
    .neq('user_id', user.id);

  if (!otherParts?.length) return [];

  // Get last message per conversation
  const { data: lastMsgs } = await supabase
    .from('messages')
    .select('conversation_id, content, created_at, sender_id')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  type LastMsg = { conversation_id: string; content: string; created_at: string; sender_id: string };
  const lastMsgMap: Record<string, LastMsg> = {};
  ((lastMsgs ?? []) as LastMsg[]).forEach((m) => {
    if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
  });

  return otherParts.map((op) => {
    const profile = op.profiles as unknown as { display_name: string; handle: string; avatar_url: string | null };
    const lastMsg = lastMsgMap[op.conversation_id];
    const lastRead = lastReadMap[op.conversation_id];
    return {
      conversation_id: op.conversation_id,
      other_user_id:   op.user_id,
      other_name:      profile.display_name,
      other_handle:    profile.handle,
      other_avatar:    profile.avatar_url,
      last_message:    lastMsg?.content ?? null,
      last_message_at: lastMsg?.created_at ?? null,
      last_sender_id:  lastMsg?.sender_id ?? null,
      last_read_at:    lastRead,
      has_unread:      !!lastMsg && (!lastRead || lastRead < lastMsg.created_at) && lastMsg.sender_id !== user.id,
    };
  }).sort((a, b) => {
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return b.last_message_at.localeCompare(a.last_message_at);
  });
}
