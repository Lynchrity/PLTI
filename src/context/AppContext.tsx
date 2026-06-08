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
import { isAdminUser } from '../services/adminService';
import { ensureUserProfile } from '../services/authService';
import { supabase } from '../services/supabase';
import type { ProfileExtras, TutorApplicationStatus, UserProfile, UserRole } from '../types';
import { getTutorApplication } from '../services/tutorApplicationService';

interface AppContextValue {
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  tutorApplicationStatus: TutorApplicationStatus | null;
  loading: boolean;
  error: string;
  profileExtras: ProfileExtras;
  setRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
  updateProfileExtras: (extras: ProfileExtras) => void;
}

const defaultExtras: ProfileExtras = {
  grade_level: '',
};

const AppContext = createContext<AppContextValue | null>(null);

function loadRole(): UserRole {
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  return stored === 'tutor' ? 'tutor' : 'student';
}

function loadExtras(): ProfileExtras {
  try {
    const raw = localStorage.getItem(PROFILE_EXTRAS_KEY);
    if (!raw) return defaultExtras;
    const parsed = JSON.parse(raw) as Partial<ProfileExtras>;
    return {
      grade_level: parsed.grade_level ?? '',
    };
  } catch {
    return defaultExtras;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole>(loadRole);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tutorApplicationStatus, setTutorApplicationStatus] =
    useState<TutorApplicationStatus | null>(null);
  const [profileExtras, setProfileExtras] = useState<ProfileExtras>(loadExtras);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshProfile = useCallback(async () => {
    setError('');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAdmin(isAdminUser(user));

      const current = await ensureUserProfile();
      setProfile(current);

      if (current) {
        const application = await getTutorApplication(current.user_id);
        setTutorApplicationStatus(application?.status ?? null);

        setProfileExtras({
          grade_level: current.grade_level ?? '',
        });
      } else {
        setTutorApplicationStatus(null);
      }
    } catch (err) {
      setProfile(null);
      setIsAdmin(false);
      setTutorApplicationStatus(null);
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
      isAdmin,
      tutorApplicationStatus,
      loading,
      error,
      profileExtras,
      setRole,
      refreshProfile,
      updateProfileExtras,
    }),
    [
      profile,
      role,
      isAdmin,
      tutorApplicationStatus,
      loading,
      error,
      profileExtras,
      setRole,
      refreshProfile,
      updateProfileExtras,
    ],
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
