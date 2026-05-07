import { createContext, useContext, useState, useEffect, useCallback, startTransition, type ReactNode } from "react";
import { supabase, apiFetch, onAuthExpired } from "./supabase";
import { resetDismissedTipsCache } from "./useDismissedTips";
import { toast } from "sonner";

export interface AppUser {
  email: string;
  role: "student" | "panelist" | "adviser" | "coordinator";
  name: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  needsProfileSetup: boolean;
  login: (u: AppUser) => Promise<void>;
  logout: () => Promise<void>;
  completeProfileSetup: () => void;
}

const SAFE_DEFAULTS: AuthState = {
  user: null,
  loading: true,
  needsProfileSetup: false,
  login: async () => {},
  logout: async () => {},
  completeProfileSetup: () => {},
};

const AuthContext = createContext<AuthState>(SAFE_DEFAULTS);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  /* Restore session on mount */
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        const u: AppUser = {
          email: session.user.email || "",
          role: (meta?.role || "student") as AppUser["role"],
          name: meta?.name || session.user.email?.split("@")[0] || "",
          avatarUrl: meta?.avatarUrl,
        };
        startTransition(() => setUser(u));
        try {
          const { profile } = await apiFetch<{ profile: any }>("/me/context", {}, session.access_token);
          if (profile) {
            if (profile.avatarUrl) {
              u.avatarUrl = profile.avatarUrl;
              startTransition(() => setUser({ ...u }));
            }
            if (!profile.profileSetupComplete) startTransition(() => setNeedsProfileSetup(true));
          }
        } catch {}
      }
      clearTimeout(timeout);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    return () => clearTimeout(timeout);
  }, []);

  /* Global 401 handler — redirect to login on session expiry */
  useEffect(() => {
    return onAuthExpired(() => {
      setUser(null);
      setNeedsProfileSetup(false);
      resetDismissedTipsCache();
      toast.error("Session expired. Please sign in again.");
      // Navigate to login — use window.location since we're outside Router
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    });
  }, []);

  const login = useCallback(async (u: AppUser) => {
    startTransition(() => setUser(u));
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (session) {
        const { profile } = await apiFetch<{ profile: any }>("/me/context", {}, session.access_token);
        if (profile) {
          if (profile.avatarUrl) startTransition(() => setUser((prev) => prev ? { ...prev, avatarUrl: profile.avatarUrl } : prev));
          if (!profile.profileSetupComplete) startTransition(() => setNeedsProfileSetup(true));
        }
      }
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    startTransition(() => {
      setUser(null);
      setNeedsProfileSetup(false);
    });
    resetDismissedTipsCache();
  }, []);

  const completeProfileSetup = useCallback(() => startTransition(() => setNeedsProfileSetup(false)), []);

  return (
    <AuthContext.Provider value={{ user, loading, needsProfileSetup, login, logout, completeProfileSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Safe to call during HMR — returns loading defaults instead of throwing */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}