import { SUBJECT_SELECT_OPTIONS } from '../../constants/filters';
import shared from '../../styles/shared.module.css';

interface SubjectMultiSelectProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
}

export function SubjectMultiSelect({ label, value, onChange }: SubjectMultiSelectProps) {
  const toggle = (subject: string) => {
    if (value.includes(subject)) {
      onChange(value.filter((s) => s !== subject));
      return;
    }
    onChange([...value, subject]);
  };

  return (
    <div className={shared.formGroup}>
      <span className={shared.label}>{label}</span>
      <div className={shared.subjectGrid}>
        {SUBJECT_SELECT_OPTIONS.map((subject) => (
          <label key={subject} className={shared.subjectOption}>
            <input
              type="checkbox"
              checked={value.includes(subject)}
              onChange={() => toggle(subject)}
            />
            {subject}
          </label>
        ))}
      </div>
    </div>
  );
}
