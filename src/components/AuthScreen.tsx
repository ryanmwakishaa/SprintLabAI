import { useState, type FormEvent } from 'react';
import { Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Spinner } from './ui';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes('Invalid login')
            ? 'Email or password is incorrect.'
            : err.message
          : 'Something went wrong. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
            <Zap size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SprintLab AI</h1>
          <p className="mt-1 text-sm text-zinc-400">Your personal sprint coaching system</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="flex rounded-xl bg-white/5 p-1 text-sm font-medium">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 transition ${
                  mode === m ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <button type="submit" disabled={busy} className="btn-primary flex items-center justify-center gap-2">
            {busy && <Spinner />}
            {mode === 'signin' ? 'Sign in' : 'Create my account'}
          </button>

          <p className="text-center text-xs text-zinc-500">
            {mode === 'signup'
              ? 'Your training data is private and synced to your account.'
              : 'New here? Create an account to get started.'}
          </p>
        </form>
      </div>
    </div>
  );
}
