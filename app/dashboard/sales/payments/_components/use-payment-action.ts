'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { customerPaymentsApi, type CustomerPayment, type PaymentAction } from '@/lib/customer-payments';

type Attempt = { key: string; action: PaymentAction };

// Keep an unresolved operation across reloads so retries reuse its original key and payload.
export function usePaymentAction(scope: string) {
  const { user } = useAuth();
  const storageKey = `customer-payment:${user?.id ?? 'session'}:${scope}`;
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Attempt | null>(null);
  const [result, setResult] = useState<CustomerPayment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      const attempt = saved ? JSON.parse(saved) as Attempt : null;
      if (attempt && (typeof attempt.key !== 'string' || !attempt.action || !['receive', 'allocate', 'reverse', 'order-payment'].includes(attempt.action.type))) throw new Error('Invalid recovery record');
      setPending(attempt);
      setResult(null);
      setReady(true);
    } catch { setError('Payment recovery is unavailable in this browser. Enable session storage to continue.'); }
  }, [storageKey]);

  const execute = async (attempt: Attempt) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); }
    catch { setError('Unable to save payment recovery information. Please enable session storage.'); lock.current = false; setBusy(false); return; }
    setPending(attempt);
    try {
      const payment = await customerPaymentsApi.execute(attempt.action, attempt.key);
      if (!payment?.id) throw new Error('The payment response was incomplete.');
      setResult(payment);
      setPending(null);
      sessionStorage.removeItem(storageKey);
    } catch (cause) {
      const definite = cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && cause.status !== 408;
      if (definite) { setPending(null); sessionStorage.removeItem(storageKey); }
      setError(definite && cause instanceof Error ? cause.message : 'The result could not be confirmed. Retry the same operation to recover its result.');
    } finally { lock.current = false; setBusy(false); }
  };
  return { ready, pending, result, error, busy,
    run: (action: PaymentAction) => { if (ready && !pending && !lock.current) void execute({ key: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join(''), action }); },
    retry: () => { if (pending) void execute(pending); },
    reset: () => { if (!pending && !lock.current) { setResult(null); setError(''); } },
  };
}
