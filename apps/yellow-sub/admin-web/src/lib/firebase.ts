import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '';
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
