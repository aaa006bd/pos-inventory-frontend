'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { realApi, Customer, SaleRecord, SalesListResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatQuantity } from '@/lib/product-quantity';

const PAGE_LIMIT = 20;

const fmt = (s: string | number) => `৳${parseFloat(String(s)).toFixed(2)}`;

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

function SaleDetailModal({ sale, onClose }: { sale: SaleRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[24px] border border-white/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.5)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-slate-900 dark:text-slate-100">{sale.saleNumber}</span>
              <StatusBadge status={sale.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {new Date(sale.soldAt).toLocaleString()} &middot; {sale.paymentMethod}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Customer + journal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Customer</p>
            {sale.customer ? (
              <>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{sale.customer.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{sale.customer.phone}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{sale.customer.email}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">Walk-in customer</p>
            )}
          </div>
          {sale.journalEntry && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Journal</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{sale.journalEntry.reference}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{sale.journalEntry.description}</p>
            </div>
          )}
        </div>

        {/* Lines table */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3">Items</p>
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Barcode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Quantity sold</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Sale Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Discount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sale.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{line.barcode ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{line.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{line.product?.sku ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatQuantity(line.quantity, line.baseUnit)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{fmt(line.salePrice)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{fmt(line.discountAmount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{fmt(line.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer totals */}
        <div className="flex flex-col items-end gap-1 border-t border-slate-100 dark:border-slate-800 px-6 py-4 text-sm">
          <div className="flex gap-8">
            <span className="text-slate-500 dark:text-slate-400">Gross</span>
            <span className="w-24 text-right text-slate-700 dark:text-slate-300">{fmt(sale.grossAmount)}</span>
          </div>
          <div className="flex gap-8">
            <span className="text-slate-500 dark:text-slate-400">Discount</span>
            <span className="w-24 text-right text-slate-700 dark:text-slate-300">− {fmt(sale.discountAmount)}</span>
          </div>
          <div className="flex gap-8 border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Net Total</span>
            <span className="w-24 text-right font-semibold text-slate-900 dark:text-slate-100">{fmt(sale.netAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesHistoryTab() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [result, setResult] = useState<SalesListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [detailSale, setDetailSale] = useState<SaleRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) router.replace('/login');
  }, [authLoading, token, router]);

  // load customers once
  useEffect(() => {
    if (!token) return;
    realApi.getCustomers()
      .then((data) => setCustomers(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [token]);

  // fetch sales whenever page or selected customer changes
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = { page, limit: PAGE_LIMIT };
    const req = selectedCustomerId
      ? realApi.getSalesByCustomer(selectedCustomerId, params)
      : realApi.getSales(params);
    req
      .then(setResult)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, page, selectedCustomerId]);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerQuery.toLowerCase())
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;

  function selectCustomer(id: number | null) {
    setSelectedCustomerId(id);
    setPage(1);
    setDropdownOpen(false);
    setCustomerQuery('');
  }

  async function openDetail(id: number) {
    setDetailLoading(true);
    try {
      const sale = await realApi.getSale(id);
      setDetailSale(sale);
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setDetailLoading(false);
    }
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
                {result.total} total
              </div>
            )}
          </div>

          {/* Customer filter */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition min-w-[180px]"
            >
              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="flex-1 truncate text-left">
                {selectedCustomer ? selectedCustomer.name : 'All customers'}
              </span>
              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
                <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                  <input
                    autoFocus
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search customers…"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-sky-400 dark:focus:border-sky-500"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  <button
                    onClick={() => selectCustomer(null)}
                    className={`w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${!selectedCustomerId ? 'font-semibold text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-200'}`}
                  >
                    All customers
                  </button>
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c.id)}
                      className={`w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedCustomerId === c.id ? 'font-semibold text-sky-600 dark:text-sky-400' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      {c.name}
                      <span className="ml-1 text-xs text-slate-400">{c.phone}</span>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-400">No customers found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-[24px] border border-white/80 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/80 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.25)] backdrop-blur overflow-hidden">
          {loading ? (
            <Spinner />
          ) : error ? (
            <div className="px-6 py-12 text-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
          ) : !result || result.items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No sales found.</p>
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
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300 max-w-[160px] truncate">{sale.saleNumber}</td>
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
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600 dark:text-slate-300">{fmt(sale.discountAmount)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">{fmt(sale.netAmount)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openDetail(sale.id)}
                          disabled={detailLoading}
                          className="rounded-lg border border-sky-200 dark:border-sky-700/50 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition disabled:opacity-50"
                        >
                          View
                        </button>
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} of {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={!result.hasNext}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
    </div>
  );
}
