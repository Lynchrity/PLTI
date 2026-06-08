import { Link } from 'react-router-dom';
import { StartChatButton } from '../StartChatButton/StartChatButton';
import { formatServicePrice } from '../../services/marketplaceService';
import type { ServiceWithTutor } from '../../types';
import { isPeerService } from '../../utils/currency';
import styles from './ServiceCard.module.css';

interface ServiceCardProps {
  service: ServiceWithTutor;
  onBook?: (service: ServiceWithTutor) => void;
  showChat?: boolean;
}

export function ServiceCard({ service, onBook, showChat = false }: ServiceCardProps) {
  const isFree = isPeerService(service.type, service.price);
  const priceLabel = formatServicePrice(service.type, service.price);

  return (
    <article className={styles.card}>
      <div className={styles.thumbnail}>
        {service.banner_url ? (
          <img src={service.banner_url} alt="" className={styles.bannerImage} />
        ) : (
          <span className={styles.thumbnailText}>
            {service.subject ?? service.type}
          </span>
        )}
        {isFree && <span className={styles.freeBadge}>Free</span>}
      </div>
      <div className={styles.body}>
        <div className={styles.sellerRow}>
          <span className={styles.avatar}>{service.tutor_name.charAt(0)}</span>
          <span>{service.tutor_name}</span>
        </div>
        <h3 className={styles.title}>{service.title}</h3>
        {service.description && <p className={styles.description}>{service.description}</p>}
        <p className={styles.rating}>
          <strong>★ {service.review_count > 0 ? service.avg_rating.toFixed(1) : 'New'}</strong>
          {service.review_count > 0 && ` (${service.review_count})`}
          {service.topic && ` · ${service.topic}`}
        </p>
        <div className={styles.footer}>
          <span className={styles.price}>{priceLabel}</span>
          <div className={styles.actions}>
            {showChat && (
              <StartChatButton
                peerId={service.creator_id}
                peerName={service.tutor_name}
                variant="outline"
              />
            )}
            {onBook ? (
              <button type="button" className={styles.bookBtn} onClick={() => onBook(service)}>
                Book
              </button>
            ) : (
              <Link to={`/search?service=${service.service_id}`} className={styles.bookBtn}>
                View
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
