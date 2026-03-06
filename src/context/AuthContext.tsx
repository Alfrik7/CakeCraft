import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getBaker } from '../lib/api';

const ADMIN_SESSION_KEY = 'cakecraft_admin_session';

export interface AdminSession {
  bakerId: string;
  bakerSlug: string;
  bakerName: string;
  bakerLogoUrl: string | null;
}

interface AuthContextValue {
  session: AdminSession | null;
  isLoading: boolean;
  loginBySlug: (slug: string) => Promise<boolean>;
  updateSessionProfile: (profile: { bakerName: string; bakerLogoUrl: string | null }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredSession(): AdminSession | null {
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;

    if (!parsed.bakerId || !parsed.bakerSlug || !parsed.bakerName) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredSession();
    setSession(stored);
    setIsLoading(false);
  }, []);

  const loginBySlug = async (slug: string): Promise<boolean> => {
    const trimmedSlug = slug.trim().toLowerCase();

    if (!trimmedSlug) {
      return false;
    }

    const baker = await getBaker(trimmedSlug);

    if (!baker) {
      return false;
    }

    const newSession: AdminSession = {
      bakerId: baker.id,
      bakerSlug: baker.slug,
      bakerName: baker.name,
      bakerLogoUrl: baker.logo_url,
    };

    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);

    return true;
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setSession(null);
  };

  const updateSessionProfile = (profile: { bakerName: string; bakerLogoUrl: string | null }) => {
    setSession((prev) => {
      if (!prev) {
        return prev;
      }

      const next: AdminSession = {
        ...prev,
        bakerName: profile.bakerName,
        bakerLogoUrl: profile.bakerLogoUrl,
      };

      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({
      session,
      isLoading,
      loginBySlug,
      updateSessionProfile,
      logout,
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
