'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';

type Attempt<T> = { version: 1; key: string; payload: T };
const key = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');

export function useDurableInventoryMutation<TPayload, TResult>(scope: string, execute: (payload: TPayload, key: string) => Promise<TResult>, onSuccess?: (result: TResult) => void) {
  const storageKey = `inventory-operation:${scope}`;
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Attempt<TPayload> | null>(null);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const successHandler = useRef(onSuccess);
  successHandler.current = onSuccess;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) as Attempt<TPayload> : null;
      if (saved && (saved.version !== 1 || typeof saved.key !== 'string' || !saved.payload)) throw new Error('invalid');
      setPending(saved); setReady(true);
    } catch { setError('Operation recovery is unavailable. Enable session storage before continuing.'); }
  }, [storageKey]);
  const perform = async (attempt: Attempt<TPayload>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); }
    catch { setError('Unable to save retry information. Enable session storage before continuing.'); lock.current = false; setBusy(false); return; }
    setPending(attempt);
    try {
      const response = await execute(attempt.payload, attempt.key);
      setResult(response); setPending(null); sessionStorage.removeItem(storageKey);
      successHandler.current?.(response);
    } catch (cause) {
      const definite = cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && cause.status !== 408;
      if (definite) { setPending(null); sessionStorage.removeItem(storageKey); }
      setError(definite && cause instanceof Error ? cause.message : 'The result could not be confirmed. Retry the same operation to recover its result.');
    } finally { lock.current = false; setBusy(false); }
  };
  return { ready, pending, result, error, busy,
    run: (payload: TPayload) => { if (ready && !pending && !lock.current) void perform({ version: 1, key: key(), payload }); },
    retry: () => { if (pending) void perform(pending); },
    reset: () => { if (!pending && !lock.current) { setResult(null); setError(''); } },
  };
}
