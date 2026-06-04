import type { ChatMessage, ChatRoomWithPeer } from '../types';
import { supabase } from './supabase';

export function formatChatListTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatMessageTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export async function getUserChatRooms(userId: string): Promise<ChatRoomWithPeer[]> {
  const { data: rooms, error } = await supabase
    .from('chat_rooms')
    .select('room_id, user1_id, user2_id, expires_at, created_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (error) {
    throw error;
  }

  if (!rooms?.length) {
    return [];
  }

  const peerIds = [
    ...new Set(rooms.map((room) => (room.user1_id === userId ? room.user2_id : room.user1_id))),
  ];

  const { data: peers, error: peersError } = await supabase
    .from('users')
    .select('user_id, name')
    .in('user_id', peerIds);

  if (peersError) {
    throw peersError;
  }

  const peerNames = new Map((peers ?? []).map((p) => [p.user_id, p.name]));

  const roomIds = rooms.map((r) => r.room_id);
  const { data: recentMessages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('room_id, content, created_at')
    .in('room_id', roomIds)
    .order('created_at', { ascending: false });

  if (messagesError) {
    throw messagesError;
  }

  const lastByRoom = new Map<string, { content: string; created_at: string }>();
  for (const msg of recentMessages ?? []) {
    if (!lastByRoom.has(msg.room_id)) {
      lastByRoom.set(msg.room_id, { content: msg.content, created_at: msg.created_at });
    }
  }

  const enriched: ChatRoomWithPeer[] = rooms.map((room) => {
    const peerId = room.user1_id === userId ? room.user2_id : room.user1_id;
    const last = lastByRoom.get(room.room_id);

    return {
      ...room,
      peer_id: peerId,
      peer_name: peerNames.get(peerId) ?? 'User',
      last_message: last?.content,
      last_message_at: last?.created_at ?? room.created_at,
    };
  });

  enriched.sort((a, b) => {
    const aTime = new Date(a.last_message_at ?? a.created_at ?? 0).getTime();
    const bTime = new Date(b.last_message_at ?? b.created_at ?? 0).getTime();
    return bTime - aTime;
  });

  return enriched;
}

export async function createOrGetChatRoom(userId1: string, userId2: string): Promise<string> {
  if (userId1 === userId2) {
    throw new Error('Cannot start a chat with yourself.');
  }

  const { data: existingRooms, error: lookupError } = await supabase
    .from('chat_rooms')
    .select('room_id')
    .or(
      `and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`,
    )
    .limit(1);

  if (lookupError) {
    throw lookupError;
  }

  if (existingRooms?.[0]?.room_id) {
    return existingRooms[0].room_id;
  }

  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({ user1_id: userId1, user2_id: userId2 })
    .select('room_id')
    .single();

  if (error) {
    throw error;
  }

  return data.room_id;
}

/** @deprecated Use createOrGetChatRoom */
export const getOrCreateChatRoom = createOrGetChatRoom;

export async function getMessages(roomId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('message_id, room_id, sender_id, content, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/** @deprecated Use getMessages */
export const getRoomMessages = getMessages;

export async function sendMessage(roomId: string, content: string): Promise<ChatMessage> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error('You must be signed in to send messages.');
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty.');
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, sender_id: user.id, content: trimmed })
    .select('message_id, room_id, sender_id, content, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function subscribeToRoomMessages(
  roomId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`chat_messages:room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
