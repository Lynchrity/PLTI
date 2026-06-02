import { useEffect, useState } from 'react';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import {
  getRoomMessages,
  getUserChatRooms,
  sendMessage,
} from '../services/chatService';
import type { ChatMessage, ChatRoomWithPeer } from '../types';
import shared from '../styles/shared.module.css';
import styles from './Chat.module.css';

export function Chat() {
  const { profile } = useApp();
  const [rooms, setRooms] = useState<ChatRoomWithPeer[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;

    getUserChatRooms(profile.user_id)
      .then((data) => {
        setRooms(data);
        if (data[0]) setActiveRoomId(data[0].room_id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load chats.'))
      .finally(() => setLoading(false));
  }, [profile]);

  useEffect(() => {
    if (!activeRoomId) return;

    getRoomMessages(activeRoomId)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load messages.'));
  }, [activeRoomId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeRoomId || !draft.trim()) return;

    try {
      const msg = await sendMessage(activeRoomId, profile.user_id, draft.trim());
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  const activeRoom = rooms.find((r) => r.room_id === activeRoomId);

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Chat</h1>
      <p className={shared.pageSubtitle}>Message tutors and peers from your chat rooms.</p>

      {error && <div className={shared.error}>{error}</div>}

      {loading ? (
        <p>Loading chats…</p>
      ) : (
        <div className={styles.chatLayout}>
          <aside className={styles.roomList}>
            {rooms.length === 0 ? (
              <p style={{ padding: 16 }} className={shared.empty}>
                No chat rooms yet. Book a session to start chatting.
              </p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.room_id}
                  type="button"
                  className={
                    room.room_id === activeRoomId
                      ? `${styles.roomItem} ${styles.roomActive}`
                      : styles.roomItem
                  }
                  onClick={() => setActiveRoomId(room.room_id)}
                >
                  <span className={styles.roomName}>{room.peer_name}</span>
                  <span className={styles.roomPreview}>
                    {room.last_message ?? 'No messages yet'}
                  </span>
                </button>
              ))
            )}
          </aside>

          <section className={styles.chatPanel}>
            {activeRoom ? (
              <>
                <div className={shared.cardHeader} style={{ borderRadius: 0 }}>
                  Chat with {activeRoom.peer_name}
                </div>
                <div className={styles.messages}>
                  {messages.map((m) => (
                    <div
                      key={m.message_id}
                      className={
                        m.sender_id === profile?.user_id
                          ? `${styles.message} ${styles.messageMine}`
                          : `${styles.message} ${styles.messageTheirs}`
                      }
                    >
                      {m.content}
                    </div>
                  ))}
                </div>
                <form className={styles.compose} onSubmit={handleSend}>
                  <input
                    className={shared.input}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                  />
                  <button type="submit" className={shared.btnPrimary}>
                    Send
                  </button>
                </form>
              </>
            ) : (
              <p style={{ padding: 24 }} className={shared.empty}>
                Select a conversation
              </p>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
}
