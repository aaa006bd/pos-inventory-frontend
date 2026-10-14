'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { realApi, Supplier, LedgerEntry, SupplierLedgerSummary, Expense, ExpenseSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { loadSupplierLedgerSummaries } from '@/lib/supplier-ledger-summary';

const EMPTY_MODAL = { supplierId: '', amount: '', description: '' };

export default function FinancePage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // supplier selector (main page)
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorQuery, setSelectorQuery] = useState('');
  const selectorRef = useRef<HTMLDivElement>(null);

  // tabs
  const [activeTab, setActiveTab] = useState<'all' | 'supplier' | 'expenses'>('all');

  // all-suppliers ledger
  const [allLedgers, setAllLedgers] = useState<SupplierLedgerSummary[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allError, setAllError] = useState('');
  const [allFilter, setAllFilter] = useState('');

  // single-supplier ledger
  const [ledger, setLedger] = useState<LedgerEntry[] | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  // modal
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState(EMPTY_MODAL);
  const [modalSupOpen, setModalSupOpen] = useState(false);
  const [modalSupQuery, setModalSupQuery] = useState('');
  const modalSupRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // expenses tab
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [expenseFilter, setExpenseFilter] = useState('');

  // expense summary
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryFrom, setSummaryFrom] = useState('');
  const [summaryTo, setSummaryTo] = useState('');

  // expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '' });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expenseFormError, setExpenseFormError] = useState('');

  useEffect(() => {
    if (!authLoading && !token) router.replace('/login');
  }, [token, authLoading, router]);

  useEffect(() => {
    if (!token) return;
    realApi.getSuppliers()
      .then(data => setSuppliers(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingSuppliers(false));
  }, [token]);

  // close supplier selector on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) setSelectorOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // close modal supplier dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalSupRef.current && !modalSupRef.current.contains(e.target as Node)) setModalSupOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchAllLedgers = () => {
    setLoadingAll(true);
    setAllError('');
    setAllLedgers(null);
    loadSupplierLedgerSummaries()
      .then(setAllLedgers)
      .catch(err => setAllError(err instanceof Error ? err.message : 'Failed to load ledgers'))
      .finally(() => setLoadingAll(false));
  };

  useEffect(() => {
    if (token && activeTab === 'all') fetchAllLedgers();
    if (token && activeTab === 'expenses') fetchExpenses();
  }, [token, activeTab]);

  const fetchLedger = (supplierId: number) => {
    setLoadingLedger(true);
    setLedgerError('');
    setLedger(null);
    realApi.getSupplierLedger(supplierId)
      .then(data => setLedger(Array.isArray(data) ? data : []))
      .catch(err => setLedgerError(err instanceof Error ? err.message : 'Failed to load ledger'))
      .finally(() => setLoadingLedger(false));
  };

  const selectedSupplier = suppliers.find(s => s.id === Number(selectedSupplierId)) ?? null;
  const filteredSelectorSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(selectorQuery.toLowerCase())
  );

  const modalSelectedSupplier = suppliers.find(s => s.id === Number(modalForm.supplierId)) ?? null;
  const filteredModalSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(modalSupQuery.toLowerCase())
  );

  const filteredLedger = (ledger ?? []).filter(entry => {
    const q = tableFilter.toLowerCase();
    return (
      entry.description.toLowerCase().includes(q) ||
      entry.reference.toLowerCase().includes(q) ||
      entry.date.includes(q)
    );
  });

  const currentBalance = ledger && ledger.length > 0 ? (ledger[ledger.length - 1].balance ?? 0) : null;
  const hasDue = (currentBalance ?? 0) > 0;

  const dueEntries = filteredLedger.filter(e => (e.credit ?? 0) > 0);
  const paidEntries = filteredLedger.filter(e => (e.debit ?? 0) > 0);

  const filteredAllLedgers = (allLedgers ?? []).filter(s =>
    s.supplierName.toLowerCase().includes(allFilter.toLowerCase())
  );

  const totalAllDebit   = filteredAllLedgers.reduce((sum, r) => sum + (r.totalDebit  ?? 0), 0);
  const totalAllCredit  = filteredAllLedgers.reduce((sum, r) => sum + (r.totalCredit ?? 0), 0);
  const totalAllBalance = filteredAllLedgers.reduce((sum, r) => sum + (r.balance     ?? 0), 0);

  const openModal = () => {
    setModalForm({ ...EMPTY_MODAL, supplierId: selectedSupplierId });
    setModalSupQuery('');
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalForm(EMPTY_MODAL);
    setModalSupQuery('');
    setFormError('');
  };

  const isReady = !!modalForm.supplierId && Number(modalForm.amount) > 0 && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormError('');
    try {
      await realApi.createSupplierPayment({
        supplierId: Number(modalForm.supplierId),
        amount: Number(modalForm.amount),
        description: modalForm.description || undefined,
      });
      const paidSupplierId = Number(modalForm.supplierId);
      closeModal();
      if (activeTab === 'all') {
        fetchAllLedgers();
      }
      // if the paid supplier is currently selected, refresh their ledger
      if (String(paidSupplierId) === selectedSupplierId) {
        fetchLedger(paidSupplierId);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchExpenses = () => {
    setLoadingExpenses(true);
    setExpenseError('');
    realApi.getExpenses()
      .then(data => setExpenses(Array.isArray(data) ? data : []))
      .catch(err => setExpenseError(err instanceof Error ? err.message : 'Failed to load expenses'))
      .finally(() => setLoadingExpenses(false));
  };

  const fetchExpenseSummary = () => {
    if (!summaryFrom || !summaryTo) return;
    setLoadingSummary(true);
    setSummaryError('');
    setExpenseSummary(null);
    realApi.getExpenseSummary({ from: summaryFrom, to: summaryTo })
      .then(data => setExpenseSummary(data))
      .catch(err => setSummaryError(err instanceof Error ? err.message : 'Failed to load summary'))
      .finally(() => setLoadingSummary(false));
  };

  const openExpenseModal = () => {
    setExpenseForm({ amount: '', description: '' });
    setExpenseFormError('');
    setShowExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setExpenseForm({ amount: '', description: '' });
    setExpenseFormError('');
  };

  const handleExpenseSubmit = async () => {
    setSubmittingExpense(true);
    setExpenseFormError('');
    try {
      await realApi.createExpense({
        amount: Number(expenseForm.amount),
        description: expenseForm.description || undefined,
      });
      closeExpenseModal();
      fetchExpenses();
    } catch (err) {
      setExpenseFormError(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white/60 dark:bg-slate-900/60 p-6 lg:p-8 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Finance</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage supplier payments and record business expenses.</p>
        </div>
        {activeTab === 'expenses' ? (
          <button
            type="button"
            onClick={openExpenseModal}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-slate-950 dark:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record Expense
          </button>
        ) : (
          <button
            type="button"
            onClick={openModal}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-slate-950 dark:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record Payment
          </button>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 p-1 w-fit">
        {(['all', 'supplier', 'expenses'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'all' ? 'All Suppliers' : tab === 'supplier' ? 'By Supplier' : 'Expenses'}
          </button>
        ))}
      </div>

      {/* ── All Suppliers tab ── */}
      {activeTab === 'all' && (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Supplier Balances</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchAllLedgers}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-emerald-400 dark:hover:border-emerald-500"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.5 9A8 8 0 0119 12m-.5 3A8 8 0 015 12" />
                </svg>
                Refresh
              </button>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <input
                  type="text"
                  value={allFilter}
                  onChange={e => setAllFilter(e.target.value)}
                  placeholder="Filter by supplier name..."
                  className="w-56 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
            </div>
          </div>

          {/* ── Summary cards ── */}
          {allLedgers && !loadingAll && (
            <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-700/60 border-b border-slate-100 dark:border-slate-700/60">
              <div className="bg-white dark:bg-slate-800/60 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Paid</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  ৳{totalAllDebit.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">across {filteredAllLedgers.length} supplier{filteredAllLedgers.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white dark:bg-slate-800/60 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Credit</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  ৳{totalAllCredit.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">invoiced by suppliers</p>
              </div>
              <div className={`px-6 py-4 ${totalAllBalance > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-slate-800/60'}`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Net Balance Due</p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${totalAllBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  ৳{totalAllBalance.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                  {totalAllBalance > 0 ? `${filteredAllLedgers.filter(r => (r.balance ?? 0) > 0).length} supplier(s) with outstanding balance` : 'all balances cleared'}
                </p>
              </div>
            </div>
          )}

          {loadingAll && (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          )}

          {allError && (
            <div className="px-5 py-4">
              <p className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{allError}</p>
            </div>
          )}

          {allLedgers && !loadingAll && (
            filteredAllLedgers.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-16">
                {allFilter ? 'No suppliers match your filter.' : 'No supplier ledgers found.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Supplier</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Total Debit</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Total Credit</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">Balance</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredAllLedgers.map(row => {
                      const rowHasDue = (row.balance ?? 0) > 0;
                      return (
                        <tr key={row.supplierId} className={`transition ${rowHasDue ? 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'}`}>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{row.supplierName}</span>
                              {rowHasDue && (
                                <span className="rounded-full bg-amber-100 dark:bg-amber-800/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Due</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-400">
                            {(row.totalDebit ?? 0) > 0 ? `৳${(row.totalDebit ?? 0).toFixed(2)}` : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums whitespace-nowrap font-semibold text-emerald-700 dark:text-emerald-400">
                            {(row.totalCredit ?? 0) > 0 ? `৳${(row.totalCredit ?? 0).toFixed(2)}` : <span className="font-normal text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                          <td className={`px-5 py-3.5 text-right tabular-nums whitespace-nowrap font-semibold ${rowHasDue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            ৳{(row.balance ?? 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('supplier');
                                setSelectedSupplierId(String(row.supplierId));
                                setTableFilter('');
                                fetchLedger(row.supplierId);
                              }}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${rowHasDue ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30' : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400'}`}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}

      {/* ── By Supplier tab ── */}
      {activeTab === 'supplier' && (
        <>
          {/* Supplier selector + balance chip */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative sm:w-72" ref={selectorRef}>
              <button
                type="button"
                onClick={() => { setSelectorOpen(o => !o); setSelectorQuery(''); }}
                className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-left shadow-sm transition hover:border-emerald-400 dark:hover:border-emerald-500 focus:outline-none"
              >
                <span className={selectedSupplier ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400 dark:text-slate-500'}>
                  {loadingSuppliers ? 'Loading...' : selectedSupplier ? selectedSupplier.name : 'Select supplier to view ledger'}
                </span>
                <svg className={`h-4 w-4 text-slate-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {selectorOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                    <input
                      autoFocus
                      value={selectorQuery}
                      onChange={e => setSelectorQuery(e.target.value)}
                      placeholder="Search supplier..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {filteredSelectorSuppliers.length === 0 ? (
                      <li className="px-4 py-2 text-sm text-slate-400">No suppliers found</li>
                    ) : filteredSelectorSuppliers.map(s => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSupplierId(String(s.id));
                            setSelectorOpen(false);
                            setSelectorQuery('');
                            setTableFilter('');
                            fetchLedger(s.id);
                          }}
                          className={`w-full px-4 py-2 text-sm text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 ${
                            selectedSupplierId === String(s.id)
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {s.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {currentBalance !== null && (
              <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 ${
                hasDue
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'
              }`}>
                <span className={`text-xs font-semibold uppercase tracking-wider ${hasDue ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {hasDue ? 'Outstanding' : 'Balance'}
                </span>
                <span className={`text-base font-bold ${hasDue ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  ৳{(currentBalance ?? 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Ledger table */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {selectedSupplier ? `${selectedSupplier.name} — Ledger` : 'Ledger'}
              </h2>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <input
                  type="text"
                  value={tableFilter}
                  onChange={e => setTableFilter(e.target.value)}
                  placeholder="Filter by date, ref, description..."
                  className="w-64 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400 transition"
                />
              </div>
            </div>

            {!selectedSupplierId && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
                <svg className="h-10 w-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
                <p className="text-sm">Select a supplier above to load their ledger</p>
              </div>
            )}

            {selectedSupplierId && loadingLedger && (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {selectedSupplierId && ledgerError && (
              <div className="px-5 py-4">
                <p className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{ledgerError}</p>
              </div>
            )}

            {ledger && !loadingLedger && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">

                {/* Outstanding due alert */}
                {hasDue && (
                  <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/40">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-600 dark:text-amber-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Outstanding balance due to {selectedSupplier?.name}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">This supplier is owed <span className="font-bold">৳{(currentBalance ?? 0).toFixed(2)}</span>. Record a payment to clear this balance.</p>
                    </div>
                    <button
                      type="button"
                      onClick={openModal}
                      className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                    >
                      Pay Now
                    </button>
                  </div>
                )}

                {filteredLedger.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-16">
                    {tableFilter ? 'No entries match your filter.' : 'No ledger entries yet.'}
                  </p>
                ) : (
                  <div className="p-5 space-y-6">

                    {/* ── Due table ── */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Due to Supplier</h3>
                        <span className="ml-auto text-xs text-slate-400">{dueEntries.length} entr{dueEntries.length === 1 ? 'y' : 'ies'}</span>
                      </div>
                      {dueEntries.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No due entries.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-amber-100 dark:border-amber-800/40">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-amber-50/60 dark:bg-amber-900/10 text-left">
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 whitespace-nowrap">Date</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 whitespace-nowrap">Reference</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 whitespace-nowrap">Description</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 text-right">Amount Due</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 text-right">Running Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50 dark:divide-amber-900/20">
                              {dueEntries.map((entry, i) => (
                                <tr key={i} className="bg-white dark:bg-slate-900/40 hover:bg-amber-50/40 dark:hover:bg-amber-900/10 transition">
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{entry.date}</td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs font-mono">{entry.reference}</td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.description}</td>
                                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-amber-700 dark:text-amber-400">
                                    ৳{(entry.credit ?? 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                                    ৳{(entry.balance ?? 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* ── Paid table ── */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Payments Made</h3>
                        <span className="ml-auto text-xs text-slate-400">{paidEntries.length} entr{paidEntries.length === 1 ? 'y' : 'ies'}</span>
                      </div>
                      {paidEntries.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No payments recorded yet.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-emerald-50/60 dark:bg-emerald-900/10 text-left">
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 whitespace-nowrap">Date</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 whitespace-nowrap">Reference</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 whitespace-nowrap">Description</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 text-right">Amount Paid</th>
                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 text-right">Running Balance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50 dark:divide-emerald-900/20">
                              {paidEntries.map((entry, i) => (
                                <tr key={i} className="bg-white dark:bg-slate-900/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition">
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{entry.date}</td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs font-mono">{entry.reference}</td>
                                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.description}</td>
                                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-emerald-700 dark:text-emerald-400">
                                    ৳{(entry.debit ?? 0).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                                    ৳{(entry.balance ?? 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Expenses tab ── */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">

          {/* Summary with date range */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expense Summary</h2>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Select a date range to view totals.</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">From</label>
                  <input
                    type="date"
                    value={summaryFrom}
                    onChange={e => setSummaryFrom(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">To</label>
                  <input
                    type="date"
                    value={summaryTo}
                    onChange={e => setSummaryTo(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
                <button
                  type="button"
                  disabled={!summaryFrom || !summaryTo || loadingSummary}
                  onClick={fetchExpenseSummary}
                  className="rounded-xl bg-slate-950 dark:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loadingSummary ? 'Loading...' : 'Apply'}
                </button>
              </div>

              {summaryError && (
                <p className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400">{summaryError}</p>
              )}

              {expenseSummary && !loadingSummary && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-rose-100 dark:border-rose-800/40 bg-rose-50/50 dark:bg-rose-900/10 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-rose-400 dark:text-rose-500">Total Expenses</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-400">
                      ৳{Number(expenseSummary.totalAmount ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">No. of Entries</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {expenseSummary.count ?? 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* All expenses list */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Expenses</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchExpenses}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-emerald-400 dark:hover:border-emerald-500"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.5 9A8 8 0 0119 12m-.5 3A8 8 0 015 12" />
                  </svg>
                  Refresh
                </button>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                  </svg>
                  <input
                    type="text"
                    value={expenseFilter}
                    onChange={e => setExpenseFilter(e.target.value)}
                    placeholder="Filter by description..."
                    className="w-56 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
              </div>
            </div>

            {loadingExpenses && (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {expenseError && (
              <div className="px-5 py-4">
                <p className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{expenseError}</p>
              </div>
            )}

            {expenses && !loadingExpenses && (() => {
              const filtered = expenses.filter(e =>
                (e.description ?? '').toLowerCase().includes(expenseFilter.toLowerCase())
              );
              return filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-16">
                  {expenseFilter ? 'No expenses match your filter.' : 'No expenses recorded yet.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">#</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Date</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Reference</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Description</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {filtered.map((expense, i) => (
                        <tr key={expense.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                          <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 text-xs font-mono">{i + 1}</td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {new Date(expense.date).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">
                            {expense.reference}
                          </td>
                          <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                            {expense.description ?? <span className="italic text-slate-300 dark:text-slate-600">No description</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums whitespace-nowrap font-semibold text-rose-700 dark:text-rose-400">
                            ৳{Number(expense.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.5)] p-7 space-y-5">

            {/* Modal header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Record Supplier Payment</h2>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Supplier dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Supplier <span className="text-rose-500">*</span>
              </label>
              <div className="relative" ref={modalSupRef}>
                <button
                  type="button"
                  onClick={() => { setModalSupOpen(o => !o); setModalSupQuery(''); }}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-left transition hover:border-emerald-400 dark:hover:border-emerald-500 focus:outline-none"
                >
                  <span className={modalSelectedSupplier ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
                    {modalSelectedSupplier ? modalSelectedSupplier.name : 'Select supplier'}
                  </span>
                  <svg className={`h-4 w-4 text-slate-400 transition-transform ${modalSupOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {modalSupOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                      <input
                        autoFocus
                        value={modalSupQuery}
                        onChange={e => setModalSupQuery(e.target.value)}
                        placeholder="Search supplier..."
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <ul className="max-h-44 overflow-y-auto py-1">
                      {filteredModalSuppliers.length === 0 ? (
                        <li className="px-4 py-2 text-sm text-slate-400">No suppliers found</li>
                      ) : filteredModalSuppliers.map(s => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setModalForm(f => ({ ...f, supplierId: String(s.id) }));
                              setModalSupOpen(false);
                              setModalSupQuery('');
                            }}
                            className={`w-full px-4 py-2 text-sm text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 ${
                              modalForm.supplierId === String(s.id)
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {s.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Amount <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden focus-within:border-emerald-500 transition">
                <span className="px-3 text-sm font-semibold text-slate-400 dark:text-slate-500 select-none">Tk</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modalForm.amount}
                  onChange={e => setModalForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 bg-transparent py-2.5 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={modalForm.description}
                onChange={e => setModalForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Paid April supplier balance"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            {/* Error */}
            {formError && (
              <p className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400">{formError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isReady}
                onClick={handleSubmit}
                className="flex-1 rounded-xl bg-slate-950 dark:bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expense Modal ── */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={closeExpenseModal} />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.5)] p-7 space-y-5">

            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Record Expense</h2>
              <button
                type="button"
                onClick={closeExpenseModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Amount <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden focus-within:border-emerald-500 transition">
                <span className="px-3 text-sm font-semibold text-slate-400 dark:text-slate-500 select-none">Tk</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="flex-1 bg-transparent py-2.5 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={expenseForm.description}
                onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Office supplies, Rent, Utilities..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            {expenseFormError && (
              <p className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400">{expenseFormError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={closeExpenseModal}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Number(expenseForm.amount) <= 0 || submittingExpense}
                onClick={handleExpenseSubmit}
                className="flex-1 rounded-xl bg-slate-950 dark:bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submittingExpense ? 'Recording...' : 'Record Expense'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
