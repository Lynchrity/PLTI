import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout/AppLayout';
import { useApp } from '../context/AppContext';
import {
  formatChatListTime,
  formatMessageTime,
  getMessages,
  getUserChatRooms,
  sendMessage,
  subscribeToRoomMessages,
} from '../services/chatService';
import type { ChatMessage, ChatRoomWithPeer } from '../types';
import shared from '../styles/shared.module.css';
import styles from './Chat.module.css';

function upsertMessage(list: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (list.some((m) => m.message_id === incoming.message_id)) {
    return list;
  }
  return [...list, incoming];
}

function bumpRoomInList(
  rooms: ChatRoomWithPeer[],
  roomId: string,
  preview: string,
  createdAt: string,
): ChatRoomWithPeer[] {
  const updated = rooms.map((room) =>
    room.room_id === roomId
      ? { ...room, last_message: preview, last_message_at: createdAt }
      : room,
  );

  return [...updated].sort((a, b) => {
    const aTime = new Date(a.last_message_at ?? a.created_at ?? 0).getTime();
    const bTime = new Date(b.last_message_at ?? b.created_at ?? 0).getTime();
    return bTime - aTime;
  });
}

export function Chat() {
  const { profile } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomFromUrl = searchParams.get('room');

  const [rooms, setRooms] = useState<ChatRoomWithPeer[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    if (!profile) return;

    const data = await getUserChatRooms(profile.user_id);
    setRooms(data);
    return data;
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    setLoadingRooms(true);
    setError('');

    loadRooms()
      .then((data) => {
        const preferred = roomFromUrl && data?.some((r) => r.room_id === roomFromUrl)
          ? roomFromUrl
          : data?.[0]?.room_id ?? null;
        setActiveRoomId(preferred);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load chats.'))
      .finally(() => setLoadingRooms(false));
  }, [profile, loadRooms, roomFromUrl]);

  const selectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setSearchParams({ room: roomId }, { replace: true });
  };

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    setError('');

    getMessages(activeRoomId)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load messages.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;

    const unsubscribe = subscribeToRoomMessages(activeRoomId, (incoming) => {
      setMessages((prev) => upsertMessage(prev, incoming));
      setRooms((prev) =>
        bumpRoomInList(prev, activeRoomId, incoming.content, incoming.created_at ?? new Date().toISOString()),
      );
    });

    return unsubscribe;
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomId, loadingMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeRoomId || !draft.trim() || sending) return;

    setSending(true);
    setError('');

    try {
      const msg = await sendMessage(activeRoomId, draft.trim());
      setMessages((prev) => upsertMessage(prev, msg));
      setRooms((prev) =>
        bumpRoomInList(prev, activeRoomId, msg.content, msg.created_at ?? new Date().toISOString()),
      );
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const activeRoom = rooms.find((r) => r.room_id === activeRoomId);

  return (
    <AppLayout>
      <h1 className={shared.pageTitle}>Chat</h1>
      <p className={shared.pageSubtitle}>Message tutors and peers from your conversations.</p>

      {error && <div className={shared.error}>{error}</div>}

      {loadingRooms ? (
        <p>Loading chats…</p>
      ) : (
        <div className={styles.chatLayout}>
          <aside className={styles.roomList} aria-label="Conversations">
            <div className={styles.roomListHeader}>Conversations</div>
            {rooms.length === 0 ? (
              <p className={styles.roomListEmpty}>No conversations yet. Start a chat from Search.</p>
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
                  onClick={() => selectRoom(room.room_id)}
                >
                  <span className={styles.roomAvatar}>{room.peer_name.charAt(0).toUpperCase()}</span>
                  <span className={styles.roomMeta}>
                    <span className={styles.roomTopRow}>
                      <span className={styles.roomName}>{room.peer_name}</span>
                      <span className={styles.roomTime}>
                        {formatChatListTime(room.last_message_at ?? room.created_at)}
                      </span>
                    </span>
                    <span className={styles.roomPreview}>
                      {room.last_message ?? 'No messages yet'}
                    </span>
                  </span>
                </button>
              ))
            )}
          </aside>

          <section className={styles.chatPanel}>
            {activeRoom ? (
              <>
                <header className={styles.chatHeader}>
                  <span className={styles.chatHeaderAvatar}>
                    {activeRoom.peer_name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong className={styles.chatHeaderName}>{activeRoom.peer_name}</strong>
                    <span className={styles.chatHeaderSub}>Direct message</span>
                  </div>
                </header>

                <div className={styles.messages} ref={messagesContainerRef}>
                  {loadingMessages ? (
                    <p className={styles.messagesStatus}>Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className={styles.messagesStatus}>No messages yet. Say hello!</p>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender_id === profile?.user_id;
                      return (
                        <div
                          key={m.message_id}
                          className={isMine ? styles.messageRowMine : styles.messageRowTheirs}
                        >
                          <div
                            className={
                              isMine
                                ? `${styles.message} ${styles.messageMine}`
                                : `${styles.message} ${styles.messageTheirs}`
                            }
                          >
                            <p className={styles.messageText}>{m.content}</p>
                            <time
                              className={styles.messageTime}
                              dateTime={m.created_at ?? undefined}
                            >
                              {formatMessageTime(m.created_at)}
                            </time>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form className={styles.compose} onSubmit={handleSend}>
                  <input
                    className={shared.input}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    disabled={sending}
                    aria-label="Message"
                  />
                  <button type="submit" className={shared.btnPrimary} disabled={sending || !draft.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className={styles.chatEmpty}>
                <p>Select a conversation or start a chat from a tutor profile.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
}
