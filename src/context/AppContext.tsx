import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PROFILE_EXTRAS_KEY, ROLE_STORAGE_KEY } from '../constants/navigation';
import { ensureUserProfile } from '../services/authService';
import type { ProfileExtras, UserProfile, UserRole } from '../types';

interface AppContextValue {
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  error: string;
  profileExtras: ProfileExtras;
  setRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
  updateProfileExtras: (extras: ProfileExtras) => void;
}

const defaultExtras: ProfileExtras = {
  subjects_good_at: '',
  subjects_need_help: '',
};

const AppContext = createContext<AppContextValue | null>(null);

function loadRole(): UserRole {
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  return stored === 'tutor' ? 'tutor' : 'student';
}

function loadExtras(): ProfileExtras {
  try {
    const raw = localStorage.getItem(PROFILE_EXTRAS_KEY);
    return raw ? { ...defaultExtras, ...(JSON.parse(raw) as ProfileExtras) } : defaultExtras;
  } catch {
    return defaultExtras;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole>(loadRole);
  const [profileExtras, setProfileExtras] = useState<ProfileExtras>(loadExtras);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshProfile = useCallback(async () => {
    setError('');
    try {
      const current = await ensureUserProfile();
      setProfile(current);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Unable to load profile.');
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const setRole = useCallback((next: UserRole) => {
    localStorage.setItem(ROLE_STORAGE_KEY, next);
    setRoleState(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const updateProfileExtras = useCallback((extras: ProfileExtras) => {
    localStorage.setItem(PROFILE_EXTRAS_KEY, JSON.stringify(extras));
    setProfileExtras(extras);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = role;
  }, [role]);

  const value = useMemo(
    () => ({
      profile,
      role,
      loading,
      error,
      profileExtras,
      setRole,
      refreshProfile,
      updateProfileExtras,
    }),
    [profile, role, loading, error, profileExtras, setRole, refreshProfile, updateProfileExtras],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
