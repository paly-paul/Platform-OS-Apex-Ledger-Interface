'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { loginSuccess } from '@/features/auth/authSlice';
import { DEV_CREDENTIALS } from '@/lib/auth-config';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      username.trim() === DEV_CREDENTIALS.username &&
      password === DEV_CREDENTIALS.password
    ) {
      dispatch(loginSuccess({ username: username.trim() }));
      router.replace('/dashboard');
    } else {
      setError('Invalid credentials. Check username and password.');
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center text-surface text-xs font-bold font-mono">
            AX
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              Apex Portfolio OS
            </div>
            <div className="text-sm font-semibold text-ink leading-tight">
              Family Office Intelligence
            </div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-8 shadow-sm">
          <h1 className="text-lg font-bold text-ink mb-1">Sign in</h1>
          <p className="text-xs text-ink-faint font-mono mb-6">
            Dev-mode login · not production auth
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="analyst@apexledger.dev"
                className="w-full border border-line rounded-lg px-3 py-2.5 text-sm font-mono bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-verified focus:ring-1 focus:ring-verified transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full border border-line rounded-lg px-3 py-2.5 text-sm font-mono bg-paper text-ink placeholder:text-ink-faint focus:outline-none focus:border-verified focus:ring-1 focus:ring-verified transition-colors"
              />
            </div>

            {error && (
              <div className="text-xs text-alert bg-alert-bg border border-alert/30 rounded-lg px-3 py-2.5 font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-ink text-surface rounded-lg py-2.5 text-sm font-semibold hover:bg-ink/90 transition-colors mt-1"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-faint font-mono mt-6">
          Apex Ledger · Internal use only
        </p>
      </div>
    </div>
  );
}
