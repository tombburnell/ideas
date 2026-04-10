import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '';
// Must be *.firebaseapp.com for hosted /__/auth/handler. Custom domains break redirect OAuth unless the server proxies (see API redirect).
const authDomain =
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
  (projectId ? `${projectId}.firebaseapp.com` : '');

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain,
  projectId,
};

const app = initializeApp(cfg);
export const auth = getAuth(app);
