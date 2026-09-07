import Link from 'next/link';
import type { ReactNode } from 'react';
import { purchaseStatusLabels, type PurchaseStatus } from '@/lib/purchases';

export const purchaseInput = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-sky-900';
export const purchaseButton = 'inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900';
export const purchaseSecondary = 'inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';
export const purchaseCard = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';

export function PurchaseShell({ title, description, actions, children, order }: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  order?: { id: number; label: string };
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span>Purchasing</span><span aria-hidden="true">/</span>
        <Link href="/dashboard/purchases" className="hover:text-sky-600">Purchase Orders</Link>
        {order && <><span aria-hidden="true">/</span><Link href={`/dashboard/purchases/${order.id}`} className="hover:text-sky-600">{order.label}</Link></>}
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-100">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

export function PurchaseError({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
    <p>{message}</p>{retry && <button type="button" onClick={retry} className="mt-2 font-semibold underline">Try again</button>}
  </div>;
}

export function PurchaseLoading() {
  return <div role="status" className={`${purchaseCard} text-sm text-slate-500`}>Loading purchase order data…</div>;
}

export function PurchaseBadge({ status }: { status: PurchaseStatus }) {
  const colors: Record<PurchaseStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    CONFIRMED: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    PARTIALLY_RECEIVED: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    RECEIVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    CANCELLED: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${colors[status] ?? colors.DRAFT}`}>{purchaseStatusLabels[status] ?? status}</span>;
}
