import { useAuth } from './lib/auth-context';
import { LoginPage } from './pages/LoginPage';
import { ShellPage } from './pages/ShellPage';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-sm text-zinc-400">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <LoginPage />;
  }
  return <ShellPage />;
}
