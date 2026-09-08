'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { realApi, type AuthResponse } from '@/lib/api';

type LoginResponse = AuthResponse & {
  access_token?: string;
  data?: {
    token?: string;
    user?: AuthResponse['user'];
  };
};

function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_32%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_48%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 px-6">
      <div className="flex flex-col items-center gap-4 text-slate-600 dark:text-slate-300">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent" />
        </div>
        <p className="text-sm font-medium">Preparing your workspace...</p>
      </div>
    </div>
  );
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login: setAuth, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === '1';
  const passwordReset = searchParams.get('reset') === '1';

  useEffect(() => {
    if (!authLoading && token) {
      router.replace('/dashboard');
    }
  }, [token, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = (await realApi.login({ email, password })) as LoginResponse;
      const token = res.token || res.access_token || res.data?.token;
      if (!token) {
        throw new Error('Invalid response: missing token');
      }
      setAuth(token, res.user ?? res.data?.user ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <LoginLoading />;
  }

  if (token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_32%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_48%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 px-6">
        <div className="rounded-3xl border border-white/70 dark:border-slate-700/50 bg-white/85 dark:bg-slate-800/85 px-6 py-5 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          Redirecting to dashboard...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.14),transparent_28%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_42%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 px-6 py-8 text-slate-900 dark:text-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="order-2 space-y-8 lg:order-1">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
              IP
            </span>
            Inventory &amp; POS
          </div>

          <div className="max-w-xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-400">
              Operations stay in motion
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Sign in to keep stock, checkout, and reporting moving together.
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
              A cleaner control point for inventory teams that need fast updates,
              reliable handoff, and a dashboard that is ready when the day starts.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Live stock sync', 'Track stock movement without losing context.'],
              ['Fast billing flow', 'Move from inventory to checkout in fewer clicks.'],
              ['Team-ready access', 'Stay aligned across staff, counters, and reports.'],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/80 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/50 p-5 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.45)] backdrop-blur"
              >
                <div className="mb-3 h-1.5 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.38)] backdrop-blur sm:p-8">
            <div className="mb-8 space-y-3">
              <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                Welcome back
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  Log in
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Use your account credentials to open the dashboard.
                </p>
              </div>
            </div>

            {registered && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
                Account created — log in to get started.
              </div>
            )}

            {passwordReset && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
                Password reset successful — log in with your new password.
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-xs font-semibold text-sky-700 dark:text-sky-400 transition hover:text-sky-800 dark:hover:text-sky-300"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-sky-600 focus:ring-sky-500"
                  />
                  Keep me signed in
                </label>
                <Link
                    href="/forgot-password"
                    className="font-medium text-sky-700 dark:text-sky-400 transition hover:text-sky-800 dark:hover:text-sky-300"
                  >
                    Forgot password?
                  </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-2xl bg-slate-950 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
              >
                {loading ? 'Signing in...' : 'Continue to dashboard'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-semibold text-sky-700 dark:text-sky-400 transition hover:text-sky-800 dark:hover:text-sky-300"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
