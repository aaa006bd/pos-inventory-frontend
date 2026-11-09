'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { realApi, SaleRecord, SalesListResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const PAGE_LIMIT = 20;

const fmt = (s: string | number) => `৳${parseFloat(String(s)).toFixed(2)}`;

const hasReturn = (sale: SaleRecord) => sale.status === 'REFUNDED' || Number(sale.returnedAmount) > 0 || (sale.lines?.some(line => Number(line.returnedQuantity) > 0) ?? false);

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50',
    PENDING: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50',
    CANCELLED: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700/50',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] ?? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent" />
    </div>
  );
}

export default function SalesHistoryTab() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [returnsOnly, setReturnsOnly] = useState(false);
  const [result, setResult] = useState<SalesListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !token) router.replace('/login');
  }, [authLoading, token, router]);

  // Search and return filtering are applied by the backend before pagination.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    realApi.getSales({ page, limit: PAGE_LIMIT, search: search || undefined, hasReturns: returnsOnly || undefined })
      .then(data => {
        if (cancelled) return;
        if (returnsOnly && data.items.some(sale => !hasReturn(sale))) {
          setResult(null);
          setError('Return filter unavailable: the backend included sales without returns. No results are shown until the filter is fixed.');
          return;
        }
        setResult(data);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, page, search, returnsOnly]);

  function applySearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setPage(1);
    setSearch(searchDraft.trim());
  }

  function changeReturnFilter(value: boolean) {
    setLoading(true);
    setError('');
    setPage(1);
    setSearch(searchDraft.trim());
    setReturnsOnly(value);
  }

  function clearFilters() {
    setLoading(true);
    setError('');
    setPage(1);
    setSearchDraft('');
    setSearch('');
    setReturnsOnly(false);
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setError('');
    setPage(nextPage);
  }

  const pageCount = result?.pageCount ?? 1;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-6xl space-y-5">

        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-900">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              Sales History
            </div>
            {result && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700/50 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                {result.total} {search || returnsOnly ? 'matching' : 'total'}
              </div>
            )}
          </div>

        </div>

        <form onSubmit={applySearch} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
          <label className="min-w-[230px] flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Sale number or customer phone
            <input aria-label="Search sales by number or phone" type="search" maxLength={100} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search sale number or phone…" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-sky-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          </label>
          <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Search</button>
          <label className="min-w-[160px] text-xs font-semibold text-slate-600 dark:text-slate-300">Return filter
            <select aria-label="Return filter" value={returnsOnly ? 'returned' : 'all'} onChange={event => changeReturnFilter(event.target.value === 'returned')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-sky-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              <option value="all">All sales</option>
              <option value="returned">Has returns</option>
            </select>
          </label>
          {(search || returnsOnly) && <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200">Clear filters</button>}
        </form>

        {/* Table card */}
        <div className="rounded-[24px] border border-white/80 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/80 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.25)] backdrop-blur overflow-hidden">
          {loading ? (
            <Spinner />
          ) : error ? (
            <div role="alert" className="px-6 py-12 text-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
          ) : !result || result.items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">{search || returnsOnly ? 'No sales match these filters.' : 'No sales found.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Sale #</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Customer</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Payment</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Discount</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Net Amount</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.items.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5 font-mono text-xs max-w-[160px] truncate"><Link className="font-semibold text-sky-700 hover:underline dark:text-sky-400" href={`/dashboard/sales/history/${sale.id}`}>{sale.saleNumber}</Link></td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {new Date(sale.soldAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200">
                        {sale.customer?.name ?? <span className="text-slate-400 italic">Walk-in</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1"><StatusBadge status={sale.status} />{hasReturn(sale) && <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:border-orange-700/50 dark:bg-orange-900/20 dark:text-orange-300">Has returns</span>}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600 dark:text-slate-300">{fmt(sale.discountAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">{fmt(sale.netAmount)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/dashboard/sales/history/${sale.id}`}
                          className="rounded-lg border border-sky-200 dark:border-sky-700/50 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition"
                        >View items</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {result && result.total > PAGE_LIMIT && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3">
              <button
                onClick={() => changePage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} of {pageCount}
              </span>
              <button
                onClick={() => changePage(Math.min(pageCount, page + 1))}
                disabled={!result.hasNext}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
