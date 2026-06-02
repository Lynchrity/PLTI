import type { ChatMessage, ChatRoomWithPeer } from '../types';
import { supabase } from './supabase';

export async function getUserChatRooms(userId: string): Promise<ChatRoomWithPeer[]> {
  const { data: rooms, error } = await supabase
    .from('chat_rooms')
    .select('room_id, user1_id, user2_id, expires_at, created_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const enriched: ChatRoomWithPeer[] = [];

  for (const room of rooms ?? []) {
    const peerId = room.user1_id === userId ? room.user2_id : room.user1_id;
    const { data: peer } = await supabase.from('users').select('name').eq('user_id', peerId).maybeSingle();

    const { data: lastMsg } = await supabase
      .from('chat_messages')
      .select('content')
      .eq('room_id', room.room_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    enriched.push({
      ...room,
      peer_id: peerId,
      peer_name: peer?.name ?? 'User',
      last_message: lastMsg?.content,
    });
  }

  return enriched;
}

export async function getOrCreateChatRoom(userId: string, peerId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('chat_rooms')
    .select('room_id')
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${peerId}),and(user1_id.eq.${peerId},user2_id.eq.${userId})`,
    )
    .limit(1)
    .maybeSingle();

  if (existing?.room_id) {
    return existing.room_id;
  }

  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({ user1_id: userId, user2_id: peerId })
    .select('room_id')
    .single();

  if (error) {
    throw error;
  }

  return data.room_id;
}

export async function getRoomMessages(roomId: string): Promise<ChatMessage[]> {
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

export async function sendMessage(roomId: string, senderId: string, content: string): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, sender_id: senderId, content })
    .select('message_id, room_id, sender_id, content, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
