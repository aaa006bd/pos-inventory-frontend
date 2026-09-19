'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export function useSalesResource<T>(load: () => Promise<T>) {
  const { token } = useAuth();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; token: string; revision: number; data?: T; error?: string }>();
  useEffect(() => {
    if (!token) return;
    let active = true;
    load().then(data => {
      if (active) setResult({ load, token, revision, data });
    }).catch(cause => {
      if (active) setResult({ load, token, revision, error: cause instanceof Error ? cause.message : 'Unable to load sales orders.' });
    });
    return () => { active = false; };
  }, [load, token, revision]);
  const current = result?.load === load && result?.token === token && result?.revision === revision;
  return {
    data: current ? result?.data : undefined,
    error: current ? result?.error : undefined,
    loading: !current,
    reload: useCallback(() => setRevision(value => value + 1), []),
  };
}
