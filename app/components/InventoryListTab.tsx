'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { InventoryBadge, InventoryCountBadge, InventoryRefreshButton, inventoryPage, inventoryStatCard } from './InventoryTheme';
import { InventoryItemWithProduct } from '@/lib/api';

interface InventoryListTabProps {
  inventory: InventoryItemWithProduct[];
  onRefresh: () => void;
  total?: number;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

type StatusFilter = 'all' | 'in_stock' | 'sold' | 'damaged' | 'returned';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'sold', label: 'Sold' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'returned', label: 'Returned' },
];

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_stock: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50',
    sold: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-700/50',
    damaged: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700/50',
    returned: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] ?? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'in_stock' ? 'bg-emerald-500' :
        status === 'sold' ? 'bg-sky-500' :
        status === 'damaged' ? 'bg-rose-500' : 'bg-amber-500'
      }`} />
      {status.replace('_', ' ')}
    </span>
  );
}

export default function InventoryListTab({ inventory, onRefresh, total, statusFilter, onStatusFilterChange, searchQuery, onSearchQueryChange }: InventoryListTabProps) {

  const counts = useMemo(() => {
    const c: Record<string, number> = { in_stock: 0, sold: 0, damaged: 0, returned: 0 };
    inventory.forEach(i => { if (i.status in c) c[i.status]++; });
    return c;
  }, [inventory]);

  return (
    <div className={inventoryPage}>
      <div className="mx-auto max-w-6xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <InventoryBadge>Serialized units</InventoryBadge>
            <InventoryCountBadge>{total ?? inventory.length} serialized units</InventoryCountBadge>
          </div>
          <InventoryRefreshButton onClick={onRefresh} />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'In Stock', value: counts.in_stock, color: 'from-emerald-500 to-sky-500', text: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'Sold', value: counts.sold, color: 'from-sky-500 to-blue-600', text: 'text-sky-700 dark:text-sky-300' },
            { label: 'Damaged', value: counts.damaged, color: 'from-rose-500 to-orange-400', text: 'text-rose-700 dark:text-rose-300' },
            { label: 'Returned', value: counts.returned, color: 'from-amber-400 to-orange-400', text: 'text-amber-700 dark:text-amber-300' },
          ].map(({ label, value, color, text }) => (
            <div key={label} className={inventoryStatCard}>
              <div className={`mb-2 h-0.5 w-8 rounded-full bg-linear-to-r ${color}`} />
              <p className={`text-2xl font-semibold ${text}`}>{value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter card */}
        <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-5 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchQueryChange(e.target.value)}
                maxLength={100}
                placeholder="Search by barcode, product or supplier..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => onStatusFilterChange(f.value)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    statusFilter === f.value
                      ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {(searchQuery || statusFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{total ?? inventory.length} result{(total ?? inventory.length) !== 1 ? 's' : ''}</span>
              <button
                onClick={() => { onSearchQueryChange(''); onStatusFilterChange('all'); }}
                className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Table card */}
        {inventory.length > 0 ? (
          <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur overflow-hidden">
            <div className="px-7 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700/50">
              <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
              <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                Items &mdash; {inventory.length}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/80">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">Barcode</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">Lot</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">Acquired</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50">Sold / Adjusted</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-sky-50/40 dark:hover:bg-sky-900/10 ${idx !== inventory.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}`}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{item.barcode}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100"><Link className="text-sky-700 hover:underline dark:text-sky-400" href={`/dashboard/inventory/balances/${item.productId}`}>{item.product?.name ?? `Product #${item.productId}`}</Link></td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{item.lotNumber ? <Link className="text-sky-700 hover:underline dark:text-sky-400" href={`/dashboard/inventory/list?lotNumber=${encodeURIComponent(item.lotNumber)}`}>{item.lotNumber}</Link> : '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{item.supplier?.name ?? <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                      <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(item.acquiredDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {item.soldDate
                          ? new Date(item.soldDate).toLocaleDateString()
                          : item.adjustedDate
                          ? new Date(item.adjustedDate).toLocaleDateString()
                          : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-12 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">No items found</p>
            <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Receive inventory to get started'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { onSearchQueryChange(''); onStatusFilterChange('all'); }}
                className="mt-4 rounded-2xl bg-slate-950 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
