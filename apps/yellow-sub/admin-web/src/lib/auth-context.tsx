import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { auth } from './firebase';

type AuthState = {
  user: User | null;
  loading: boolean;
  /** Set when Google redirect returns but sign-in failed (check OAuth redirect URIs in Google Cloud). */
  redirectError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      await auth.authStateReady();
      if (cancelled) return;
      try {
        await getRedirectResult(auth);
      } catch (e: unknown) {
        const code =
          e && typeof e === 'object' && 'code' in e
            ? String((e as { code?: string }).code)
            : '';
        // auth/no-auth-event = normal when user did not just return from redirect
        if (code && code !== 'auth/no-auth-event') {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[auth] getRedirectResult failed:', code, msg);
          setRedirectError(
            `${msg} (${code}). If this persists, add the Firebase auth handler URL to Google Cloud OAuth "Authorized redirect URIs".`,
          );
        }
      }
      if (cancelled) return;
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (u) setRedirectError(null);
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  /** Redirect flow avoids popup issues (third-party cookies, COOP, blockers). */
  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      redirectError,
      signInWithGoogle,
      signOutUser,
      getIdToken,
    }),
    [user, loading, redirectError, signInWithGoogle, signOutUser, getIdToken],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider required');
  return v;
}
