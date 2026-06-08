import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { createOrGetChatRoom } from '../../services/chatService';
import { getErrorMessage } from '../../utils/errors';
import shared from '../../styles/shared.module.css';
import styles from './StartChatButton.module.css';

interface StartChatButtonProps {
  peerId: string;
  peerName?: string;
  variant?: 'primary' | 'outline';
  className?: string;
}

export function StartChatButton({
  peerId,
  peerName,
  variant = 'outline',
  className = '',
}: StartChatButtonProps) {
  const { profile } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    if (!profile) return;
    if (profile.user_id === peerId) {
      setError('You cannot chat with yourself.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const roomId = await createOrGetChatRoom(profile.user_id, peerId, peerName);
      navigate(`/chat?room=${roomId}`);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start chat.'));
    } finally {
      setLoading(false);
    }
  };

  const btnClass =
    variant === 'primary'
      ? `${shared.btnPrimary} ${styles.btn} ${className}`
      : `${shared.btnOutline} ${styles.btn} ${className}`;

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={btnClass}
        onClick={handleClick}
        disabled={loading || !profile}
        aria-label={peerName ? `Chat with ${peerName}` : 'Start chat'}
      >
        {loading ? 'Opening…' : 'Chat'}
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </span>
  );
}
