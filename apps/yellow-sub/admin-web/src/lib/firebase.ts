import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '';
/** Same public origin as API PUBLIC_BASE_URL — use in prod so authDomain matches /__/firebase/init.json */
const publicOrigin = import.meta.env.VITE_PUBLIC_ORIGIN?.trim().replace(/\/$/, '') ?? '';
let authDomainFromOrigin = '';
try {
  if (publicOrigin) authDomainFromOrigin = new URL(publicOrigin).hostname;
} catch {
  /* ignore */
}
const authDomain =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
  authDomainFromOrigin ||
  (projectId ? `${projectId}.firebaseapp.com` : '');

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain,
  projectId,
};

const app = initializeApp(cfg);
export const auth = getAuth(app);
