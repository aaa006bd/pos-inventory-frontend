'use client';

import { useState, useEffect, useRef } from 'react';
import { realApi } from '@/lib/api';
import { Product, DailyStockResponse } from '@/lib/api';
import { formatQuantity, serializedTracking, type ProductTracking } from '@/lib/product-quantity';

interface DailyStockTabProps {
  products: Product[];
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export default function DailyStockTab({ products, showMessage }: DailyStockTabProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('');
  const [stock, setStock] = useState<DailyStockResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const result = await realApi.getDailyStock(date, Number(productId));
      setStock(result);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to get daily stock');
      setStock(null);
    } finally {
      setLoading(false);
    }
  };

  const selected = products.find(p => p.id === Number(productId));
  const tracking: ProductTracking = selected?.trackingMode && selected.baseUnit && selected.quantityPrecision != null
    ? { trackingMode: selected.trackingMode, baseUnit: selected.baseUnit, quantityPrecision: selected.quantityPrecision }
    : serializedTracking;
  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

  const movement = stock ? stock.closing - stock.opening : 0;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </span>
          Daily Stock Report
        </div>

        {/* Query card */}
        <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
          <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
          <div className="mb-6">
            <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
              Query
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a product and date to view opening and closing stock</p>
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-5">

            {/* Product dropdown */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Product *</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm outline-none transition hover:border-slate-300 dark:hover:border-slate-500 focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 flex items-center justify-between gap-3"
                >
                  {selected ? (
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-xs font-bold text-sky-700 dark:text-sky-300">
                        {selected.name[0].toUpperCase()}
                      </span>
                      <span className="flex flex-col items-start">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selected.name}</span>
                        {selected.basePrice && <span className="text-xs text-slate-400">৳{selected.basePrice} each</span>}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Select a product...</span>
                  )}
                  <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute z-20 w-full mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.30)] overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80">
                      <div className="relative">
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder="Search products..."
                          autoFocus
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                        />
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400">No products found</p>
                      ) : filtered.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setProductId(p.id.toString()); setDropdownOpen(false); setQuery(''); setStock(null); }}
                          className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sky-50/60 dark:hover:bg-slate-700/60 ${p.id === Number(productId) ? 'bg-sky-50 dark:bg-slate-700/80' : ''}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/40 text-xs font-bold text-sky-700 dark:text-sky-300">
                            {p.name[0].toUpperCase()}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                            {p.basePrice && <div className="text-xs text-slate-400">৳{p.basePrice} each</div>}
                          </div>
                          {p.id === Number(productId) && (
                            <svg className="w-4 h-4 text-sky-500 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Date *</label>
              <div className="relative">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={date}
                  onChange={e => { setDate(e.target.value); setStock(null); }}
                  required
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !productId}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Get Stock Report
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {stock && (
          <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
            <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-orange-400 to-sky-500" />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
                  Results
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selected?.name} &mdash; {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Opening Stock', value: formatQuantity(stock.opening, tracking.baseUnit), color: 'from-sky-500 to-blue-600', text: 'text-sky-700 dark:text-sky-300' },
                { label: 'Closing Stock', value: formatQuantity(stock.closing, tracking.baseUnit), color: 'from-emerald-500 to-sky-500', text: 'text-emerald-700 dark:text-emerald-300' },
                {
                  label: 'Movement',
                  value: `${movement >= 0 ? '+' : ''}${formatQuantity(movement, tracking.baseUnit)}`,
                  color: movement < 0 ? 'from-rose-500 to-orange-400' : 'from-emerald-500 to-teal-500',
                  text: movement < 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300',
                },
              ].map(({ label, value, color, text }) => (
                <div key={label} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 px-5 py-5">
                  <div className={`mb-3 h-0.5 w-8 rounded-full bg-linear-to-r ${color}`} />
                  <p className={`text-3xl font-semibold ${text}`}>{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
