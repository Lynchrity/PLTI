export const SUBJECT_OPTIONS = [
  'All subjects',
  'Mathematics',
  'Science',
  'English',
  'History',
  'Computer Science',
  'Software Engineering',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
];

export const GRADE_LEVEL_OPTIONS = [
  'All grades',
  'Elementary',
  'Middle School',
  'High School',
  'Undergraduate',
  'Graduate',
  'Higher than Undergraduate',
];

export const GRADE_SELECT_OPTIONS = GRADE_LEVEL_OPTIONS.filter((g) => g !== 'All grades');

export const SUBJECT_SELECT_OPTIONS = SUBJECT_OPTIONS.filter((s) => s !== 'All subjects');

export const DURATION_OPTIONS = [
  { label: 'Any duration', value: '' },
  { label: '15 minutes', value: '15' },
  { label: '30 minutes', value: '30' },
  { label: '45 minutes', value: '45' },
  { label: '60 minutes', value: '60' },
  { label: '90+ minutes', value: '90' },
];

export const RATING_OPTIONS = [
  { label: 'Any rating', value: '0' },
  { label: '4+ stars', value: '4' },
  { label: '4.5+ stars', value: '4.5' },
  { label: '5 stars', value: '5' },
];

export const SERVICE_TYPE_OPTIONS = [
  { label: 'All services', value: '' },
  { label: 'Tutoring', value: 'tutoring' },
  { label: 'Peer (free)', value: 'peer' },
];
