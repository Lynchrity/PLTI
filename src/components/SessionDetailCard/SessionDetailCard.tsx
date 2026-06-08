import { Link } from 'react-router-dom';
import shared from '../../styles/shared.module.css';

interface SessionDetailCardProps {
  title: string;
  rows: { label: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
}

export function SessionDetailCard({ title, rows, actions }: SessionDetailCardProps) {
  return (
    <article className={shared.detailCard}>
      <div className={shared.cardHeader}>{title}</div>
      <div className={shared.detailCardBody}>
        {rows.map((row) => (
          <p key={row.label} className={shared.detailRow}>
            <strong>{row.label}</strong>
            {row.value}
          </p>
        ))}
        {actions && <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>{actions}</div>}
      </div>
    </article>
  );
}

export function SessionDetailCardLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={className ?? shared.btnOutline}>
      {children}
    </Link>
  );
}
