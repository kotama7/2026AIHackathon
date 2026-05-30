'use client';

import {
  type User,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { getAuth } from './client';

type AuthState = {
  uid: string | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const auth = getAuth();
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      auth,
      (user: User | null) => {
        if (cancelled) return;
        if (user) {
          setUid(user.uid);
          setLoading(false);
          setError(null);
        } else {
          signInAnonymously(auth).catch((err: unknown) => {
            if (cancelled) return;
            setError(err instanceof Error ? err : new Error(String(err)));
            setLoading(false);
          });
        }
      },
      (err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((c) => c + 1);
  }, []);

  if (loading) {
    return <AuthSplash />;
  }

  if (error) {
    return <AuthErrorScreen message={error.message} onRetry={retry} />;
  }

  return (
    <AuthContext.Provider value={{ uid, loading, error, retry }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

function AuthSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="font-serif text-brand-muted">サインイン中…</p>
    </div>
  );
}

function AuthErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-page">
      <p className="font-serif text-xl text-brand-danger">
        サインインに失敗しました
      </p>
      <p className="max-w-prose text-sm text-brand-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-card border border-brand-border bg-brand-surface px-4 py-2 text-brand-text transition hover:bg-brand-bg"
      >
        リトライ
      </button>
    </div>
  );
}
