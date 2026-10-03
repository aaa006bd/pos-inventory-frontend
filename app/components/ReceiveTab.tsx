'use client';

import { useState, useEffect, useRef } from 'react';
import { realApi } from '@/lib/api';
import { Product, Supplier, type ReceiveBatchInput } from '@/lib/api';
import { validProductQuantity, formatQuantity } from '@/lib/product-quantity';
import { useDurableInventoryMutation } from './useDurableInventoryMutation';

interface ReceiveFormData {
  productId: string;
  quantity: string;
  supplierId: string;
  unitCost: string;
  notes: string;
}

interface ReceiveTabProps {
  products: Product[];
  showMessage: (type: 'success' | 'error', text: string) => void;
}

function Dropdown<T extends { id: number; name: string }>({
  items,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  renderMeta,
  avatarColor = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}: {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  renderMeta?: (item: T) => React.ReactNode;
  avatarColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = items.find(i => i.id === Number(value));
  const filtered = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm outline-none transition hover:border-slate-300 dark:hover:border-slate-500 focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 flex items-center justify-between gap-3"
      >
        {selected ? (
          <span className="flex items-center gap-3 min-w-0">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${avatarColor}`}>
              {selected.name[0].toUpperCase()}
            </span>
            <span className="flex flex-col items-start min-w-0">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{selected.name}</span>
              {renderMeta && <span className="text-xs text-slate-400">{renderMeta(selected)}</span>}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 w-full mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.30)] overflow-hidden">
          {/* Search */}
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
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">No results found</p>
            ) : filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onChange(item.id.toString()); setOpen(false); setQuery(''); }}
                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sky-50/60 dark:hover:bg-slate-700/60 ${item.id === Number(value) ? 'bg-sky-50 dark:bg-slate-700/80' : ''}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${avatarColor}`}>
                  {item.name[0].toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</div>
                  {renderMeta && <div className="text-xs text-slate-400">{renderMeta(item)}</div>}
                </div>
                {item.id === Number(value) && (
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
  );
}

export default function ReceiveTab({ products, showMessage }: ReceiveTabProps) {
  const [form, setForm] = useState<ReceiveFormData>({ productId: '', quantity: '', supplierId: '', unitCost: '', notes: '' });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const operation = useDurableInventoryMutation<ReceiveBatchInput, Awaited<ReturnType<typeof realApi.receiveBatchInventory>>>('manual-receipt', realApi.receiveBatchInventory);

  useEffect(() => {
    realApi.getSuppliers()
      .then(data => setSuppliers(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!selectedProduct || !form.quantity || !form.supplierId) return;
    const tracking = { trackingMode: selectedProduct.trackingMode ?? 'SERIALIZED', baseUnit: selectedProduct.baseUnit ?? 'piece', quantityPrecision: selectedProduct.quantityPrecision ?? 0 };
    if (!validProductQuantity(form.quantity, tracking)) { showMessage('error', `Enter a positive quantity with at most ${tracking.quantityPrecision} decimal places.`); return; }
    operation.run({
        productId: Number(form.productId),
        quantity: Number(form.quantity),
        supplierId: Number(form.supplierId),
        unitCost: Number(form.unitCost),
        notes: form.notes || undefined,
      });
  };

  const selectedProduct = products.find(p => p.id === Number(form.productId));
  const selectedSupplier = suppliers.find(s => s.id === Number(form.supplierId));
  const isReady = !!form.productId && !!form.quantity && !!form.supplierId && !!form.unitCost && operation.ready && !operation.busy && !operation.pending;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </span>
          Receive Inventory
        </div>

        {/* Form card */}
        <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
          <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
          <div className="mb-6">
            <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
              Batch details
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fill in the details to log a new inventory batch</p>
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-5">

            {/* Supplier */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Supplier *</label>
              <Dropdown
                items={suppliers}
                value={form.supplierId}
                onChange={id => setForm({ ...form, supplierId: id })}
                placeholder="Select a supplier..."
                searchPlaceholder="Search suppliers..."
                avatarColor="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
              />
            </div>

            {/* Product */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Product *</label>
              <Dropdown
                items={products}
                value={form.productId}
                onChange={id => setForm({ ...form, productId: id })}
                placeholder="Select a product..."
                searchPlaceholder="Search products..."
                avatarColor="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"
                renderMeta={(p: Product) => `${p.trackingMode === 'QUANTITY' ? 'Quantity' : 'Serialized'} · ${p.baseUnit ?? 'piece'}`}
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Quantity{selectedProduct ? ` (${selectedProduct.baseUnit ?? 'piece'})` : ''} *</label>
              <div className="relative">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                <input
                  type="number"
                  min={selectedProduct?.quantityPrecision ? 10 ** -selectedProduct.quantityPrecision : 1}
                  step={selectedProduct?.quantityPrecision ? 10 ** -selectedProduct.quantityPrecision : 1}
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  placeholder={selectedProduct ? `Amount in ${selectedProduct.baseUnit ?? 'piece'}` : 'Quantity to receive'}
                  required
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                />
              </div>
            </div>

            {/* Unit Cost */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Cost per {selectedProduct?.baseUnit ?? 'unit'} *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 dark:text-slate-500 pointer-events-none">Tk</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={e => setForm({ ...form, unitCost: e.target.value })}
                  placeholder="0.00"
                  required
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Batch details, condition notes..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 resize-none"
              />
            </div>

            {/* Preview */}
            {selectedProduct && selectedSupplier && form.quantity && (
              <div className="rounded-2xl border border-sky-200 dark:border-sky-700/50 bg-sky-50/70 dark:bg-sky-900/20 px-5 py-4">
                <div className="mb-2 h-0.5 w-6 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-600 dark:text-sky-400 mb-2">Summary</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-6">
                  Receiving{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatQuantity(Number(form.quantity), selectedProduct.baseUnit ?? 'piece')}</span>
                  {' '}of{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedProduct.name}</span>
                  {form.unitCost && (
                    <> at <span className="font-semibold text-slate-900 dark:text-slate-100">৳{Number(form.unitCost).toFixed(2)}</span> per {selectedProduct.baseUnit ?? 'piece'}</>
                  )}
                  {' '}from{' '}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedSupplier.name}</span>.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isReady}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
            >
              {operation.busy ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Receiving inventory...
                </>
              ) : 'Receive Inventory'}
            </button>
            {operation.error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{operation.error}</div>}
            {operation.pending && <button type="button" className="w-full rounded-xl border p-3 text-sm font-semibold" disabled={operation.busy} onClick={operation.retry}>Recover receipt result</button>}
            {operation.result && <div role="status" className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><p>Received {formatQuantity(operation.result.lot.quantityReceived, selectedProduct?.baseUnit ?? 'piece')} in lot <strong>{operation.result.lot.lotNumber}</strong>.</p><p>{operation.result.items.length ? `${operation.result.items.length} barcode units created.` : 'Quantity balance updated; no barcode units were created.'}</p><button type="button" className="underline" onClick={() => { operation.reset(); setForm({ productId: '', quantity: '', supplierId: '', unitCost: '', notes: '' }); }}>Receive another batch</button></div>}
          </form>
        </div>
      </div>
    </div>
  );
}
