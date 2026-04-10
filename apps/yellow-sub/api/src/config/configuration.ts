export type AppConfiguration = {
  nodeEnv: string;
  port: number;
  publicBaseUrl: string;
  databaseUrl: string;
  redisUrl: string;
  credentialsEncryptionKeyHex: string;
  firebaseProjectId: string;
  firebaseServiceAccountJson: string | null;
  adminEmailAllowlist: string[];
  disableWorkers: boolean;
  adminStaticPath: string | null;
  /** Log each HTTP request (method, path, status, duration). */
  logHttp: boolean;
  /** Same web API key as VITE_FIREBASE_API_KEY — used for GET /__/firebase/init.json when not using Firebase Hosting */
  firebaseWebApiKey: string;
  /** Optional full Firebase web config JSON (overrides auto-built init.json). */
  firebaseWebConfigJson: string | null;
  /** authDomain for /__/firebase/init.json — default: hostname of PUBLIC_BASE_URL */
  firebaseAuthDomain: string;
};

function parseBool(v: string | undefined, defaultVal: boolean): boolean {
  if (v === undefined || v === '') return defaultVal;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function parseAdminEmails(v: string | undefined): string[] {
  if (!v?.trim()) return [];
  return v
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function hostnameFromPublicUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function resolveFirebaseProjectId(): string {
  const fromEnv = process.env.FIREBASE_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!json) return '';
  try {
    const o = JSON.parse(json) as { project_id?: string };
    return o.project_id?.trim() ?? '';
  } catch {
    return '';
  }
}

export default (): AppConfiguration => {
  const publicBaseUrl = (process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000').replace(
    /\/$/,
    '',
  );
  const firebaseAuthDomain =
    process.env.FIREBASE_AUTH_DOMAIN?.trim() || hostnameFromPublicUrl(publicBaseUrl);
  return {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  publicBaseUrl,
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  credentialsEncryptionKeyHex: process.env.CREDENTIALS_ENCRYPTION_KEY ?? '',
  firebaseProjectId: resolveFirebaseProjectId(),
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? null,
  adminEmailAllowlist: parseAdminEmails(process.env.ADMIN_EMAIL_ALLOWLIST),
  disableWorkers: parseBool(process.env.DISABLE_WORKERS, false),
  adminStaticPath: process.env.ADMIN_DIST_PATH ?? null,
  logHttp: parseBool(process.env.LOG_HTTP, true),
  firebaseWebApiKey: process.env.FIREBASE_WEB_API_KEY?.trim() ?? '',
  firebaseWebConfigJson: process.env.FIREBASE_WEB_CONFIG_JSON?.trim() ?? null,
  firebaseAuthDomain,
  };
};
