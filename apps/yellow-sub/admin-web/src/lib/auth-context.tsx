import {
  browserLocalPersistence,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
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
const REDIRECT_PENDING_KEY = 'ys_auth_redirect_pending';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const pendingReturn =
        typeof window !== 'undefined' &&
        sessionStorage.getItem(REDIRECT_PENDING_KEY) === '1';
      if (pendingReturn) {
        sessionStorage.removeItem(REDIRECT_PENDING_KEY);
      }
      const urlLooksLikeHandler =
        typeof window !== 'undefined' &&
        (window.location.hash.includes('apiKey=') ||
          window.location.search.includes('apiKey=') ||
          /\/__\/auth\/handler/.test(window.location.href));
      const fromOAuth = pendingReturn || urlLooksLikeHandler;
      console.info(
        '[YellowSub auth] initializing',
        fromOAuth
          ? '(returning after Sign in with Google — getRedirectResult should complete)'
          : '(fresh load)',
      );
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        /* non-fatal */
      }
      // Process OAuth redirect before authStateReady so session is not missed (redirect flow).
      try {
        const cred = await getRedirectResult(auth);
        if (cred?.user && !cancelled) {
          console.info('[YellowSub auth] redirect sign-in ok uid=', cred.user.uid);
        } else {
          console.info('[YellowSub auth] getRedirectResult: no pending redirect (normal on fresh load)');
        }
      } catch (e: unknown) {
        const code =
          e && typeof e === 'object' && 'code' in e
            ? String((e as { code?: string }).code)
            : '';
        if (code && code !== 'auth/no-auth-event') {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('[YellowSub auth] getRedirectResult failed:', code, msg);
          setRedirectError(
            `${msg} (${code}). If this persists, add the Firebase auth handler URL to Google Cloud OAuth "Authorized redirect URIs".`,
          );
        }
      }
      await auth.authStateReady();
      if (cancelled) return;
      if (fromOAuth && !auth.currentUser) {
        console.warn(
          '[YellowSub auth] returned from Google but still no user. Check: (1) GET /auth/debug has firebaseProjectId (2) server logs show redirect /__/auth/handler (3) Firebase Console → Auth → Users (4) OAuth redirect URIs include *.firebaseapp.com/__/auth/handler',
        );
      }
      unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          console.info('[YellowSub auth] signed in', u.email ?? u.uid);
        } else {
          console.info('[YellowSub auth] no Firebase user session (signed out or not completed)');
        }
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
    sessionStorage.setItem(REDIRECT_PENDING_KEY, '1');
    console.info(
      '[YellowSub auth] starting Google redirect; after Google you should land on same origin:',
      window.location.origin,
    );
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
