import type { ReactNode } from 'react';

export const inventoryPage = 'min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6';
export const inventoryCard = 'rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur';
export const inventoryButton = 'flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm disabled:opacity-40';
export const inventoryStatCard = 'rounded-2xl border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 px-5 py-4 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.20)] backdrop-blur';

export function InventoryBadge({ children }: { children: ReactNode }) {
  return <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    </span>{children}
  </div>;
}

export function InventoryCountBadge({ children }: { children: ReactNode }) {
  return <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700/50 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />{children}</div>;
}

export function InventoryRefreshButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className={inventoryButton}>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
    Refresh
  </button>;
}
