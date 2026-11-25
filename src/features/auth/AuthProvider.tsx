import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/services/supabase/client';

type AuthState = {
  session: Session | null;
  /** True until the persisted session has been read from storage. */
  isRestoring: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setIsRestoring(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsRestoring(false);
      // Never leak one user's cached data to the next.
      if (event === 'SIGNED_OUT') queryClient.clear();
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, isRestoring }), [session, isRestoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** Signed-in user id. Only call from screens behind the auth guard. */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('useUserId called without a session');
  return session.user.id;
}
