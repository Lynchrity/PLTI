import shared from '../../styles/shared.module.css';
import styles from './AdminApplicationFilters.module.css';

export type SortOrder = 'newest' | 'oldest';

interface AdminApplicationFiltersProps {
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  submittedDate: string;
  onSubmittedDateChange: (date: string) => void;
  onClearDate: () => void;
}

export function AdminApplicationFilters({
  sortOrder,
  onSortOrderChange,
  submittedDate,
  onSubmittedDateChange,
  onClearDate,
}: AdminApplicationFiltersProps) {
  const toggleSort = () => {
    onSortOrderChange(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  return (
    <div className={styles.toolbar}>
      <button type="button" className={shared.btnOutline} onClick={toggleSort}>
        {sortOrder === 'newest' ? 'Most recent first' : 'Oldest first'}
      </button>

      <label className={styles.dateFilter}>
        <span className={styles.dateLabel}>Search by date</span>
        <input
          type="date"
          className={shared.input}
          value={submittedDate}
          onChange={(e) => onSubmittedDateChange(e.target.value)}
          aria-label="Filter applications by submission date"
        />
      </label>

      {submittedDate && (
        <button type="button" className={shared.btnOutline} onClick={onClearDate}>
          Clear date
        </button>
      )}
    </div>
  );
}
