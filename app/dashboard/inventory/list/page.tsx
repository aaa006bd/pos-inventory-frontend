'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { realApi, InventoryItemWithProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import InventoryListTab from '@/app/components/InventoryListTab';

const LIMIT_OPTIONS = [10, 20, 30, 40, 100] as const;
type LimitOption = typeof LIMIT_OPTIONS[number];
type StatusFilter = 'all' | InventoryItemWithProduct['status'];

export default function InventoryListPage() {
  return <Suspense fallback={<p>Loading inventory…</p>}><InventoryListRoute /></Suspense>;
}

function InventoryListRoute() {
  const lotNumber = useSearchParams().get('lotNumber') ?? '';
  return <InventoryListContent key={lotNumber} lotNumber={lotNumber} />;
}

function InventoryListContent({ lotNumber }: { lotNumber: string }) {
  const { token } = useAuth();
  const [inventory, setInventory] = useState<InventoryItemWithProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limitOption, setLimitOption] = useState<LimitOption>(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInventory = useCallback(async (p: number, lim: number, status: StatusFilter, search: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await realApi.getInventory({ page: p, limit: lim, lotNumber: lotNumber || undefined, status: status === 'all' ? undefined : status, search: search || undefined });
      setInventory(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [lotNumber]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (token) fetchInventory(page, limitOption, statusFilter, debouncedSearch);
  }, [token, page, limitOption, statusFilter, debouncedSearch, fetchInventory]);

  const pageCount = Math.max(1, Math.ceil(total / limitOption));

  const handleLimitChange = (opt: LimitOption) => {
    setLimitOption(opt);
    setPage(1);
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <>
      {lotNumber && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 p-4 text-sm dark:border-sky-800"><span>Stock for lot: <strong>{lotNumber}</strong></span><Link href="/dashboard/inventory/list" className="text-sky-600 underline">Show all inventory</Link></div>}
      {error && <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-rose-700 dark:bg-rose-950 dark:text-rose-200">{error} <button className="underline" onClick={() => fetchInventory(page, limitOption, statusFilter, debouncedSearch)}>Try again</button></div>}
      <InventoryListTab
        inventory={inventory}
        onRefresh={() => fetchInventory(page, limitOption, statusFilter, debouncedSearch)}
        total={total}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusChange}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <div className="flex items-center justify-between gap-4 px-6 pb-6 max-w-6xl mx-auto">
        {/* Limit selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rows per page:</span>
          <div className="flex items-center gap-1">
            {LIMIT_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => handleLimitChange(opt)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  limitOption === opt
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Page {page} of {pageCount}
            </span>
            <button
              disabled={page >= pageCount || loading}
              onClick={() => setPage(p => p + 1)}
              className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}
