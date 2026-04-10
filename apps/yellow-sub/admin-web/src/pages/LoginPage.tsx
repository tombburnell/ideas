import { useAuth } from '../lib/auth-context';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'your-project-id';

export function LoginPage() {
  const { signInWithGoogle, redirectError } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Yellow Sub</h1>
        <p className="mt-2 text-sm text-zinc-400">Operator console</p>
      </div>
      {redirectError && (
        <div
          role="alert"
          className="max-w-lg rounded-lg border border-red-900 bg-red-950/80 px-4 py-3 text-left text-sm text-red-200"
        >
          <p className="font-medium text-red-100">Sign-in did not complete</p>
          <p className="mt-2 whitespace-pre-wrap font-mono text-xs">{redirectError}</p>
          <p className="mt-3 text-xs text-red-300/90">
            In Google Cloud → APIs &amp; Services → Credentials → your OAuth 2.0 Web client → add
            Authorized redirect URI:{' '}
            <code className="rounded bg-red-900/50 px-1">
              {`https://${projectId}.firebaseapp.com/__/auth/handler`}
            </code>{' '}
            , save, then try again.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="rounded-lg bg-amber-400 px-6 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-300"
      >
        Sign in with Google
      </button>
      <p className="max-w-md text-center text-xs text-zinc-500">
        Your email must be in the server allowlist and have AdminScope rows for full access.
      </p>
    </div>
  );
}
