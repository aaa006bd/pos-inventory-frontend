'use client';

import { useState, useRef } from 'react';
import { realApi, type SupplierReturnInput } from '@/lib/api';
import { useDurableInventoryMutation } from './useDurableInventoryMutation';

type ReturnMode = 'single' | 'batch' | 'lot';

interface AdjustTabProps {
  onSuccess: () => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}

const MODES: { value: ReturnMode; label: string; description: string }[] = [
  { value: 'single', label: 'Single Item', description: 'Return one item by barcode' },
  { value: 'batch', label: 'Batch Items', description: 'Return multiple items at once' },
  { value: 'lot', label: 'Lot Return', description: 'Return an entire lot' },
];

// ── Lot Number Field with scan ────────────────────────────────────────────────

interface LotNumberFieldProps {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  label?: string;
}

function LotNumberField({ value, onChange, required = false, label = 'Lot Number' }: LotNumberFieldProps) {
  const [scanOpen, setScanOpen] = useState(required);
  const [scanBarcode, setScanBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<{ productName: string; lotNumber: string } | null>(null);
  const [scanError, setScanError] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!scanBarcode.trim()) return;
    setScanning(true);
    setScanError('');
    setPreview(null);
    try {
      const item = await realApi.scanBarcode(scanBarcode.trim());
      if (!item.lotNumber) {
        setScanError('This item has no lot number assigned.');
        return;
      }
      onChange(item.lotNumber);
      setPreview({ productName: item.product?.name ?? scanBarcode.trim(), lotNumber: item.lotNumber });
      setScanBarcode('');
      setScanOpen(false);
    } catch {
      setScanError('Item not found. Check the barcode and try again.');
    } finally {
      setScanning(false);
    }
  };

  const openScan = () => {
    setScanOpen(true);
    setScanError('');
    setPreview(null);
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  return (
    <div>
      <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>{label}{required ? ' *' : ''} {!required && <span className="text-slate-400 font-normal">(optional)</span>}</span>
        <button
          type="button"
          onClick={scanOpen ? () => { setScanOpen(false); setScanError(''); } : openScan}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-sky-100 dark:hover:bg-sky-900/40 hover:text-sky-700 dark:hover:text-sky-300"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          {scanOpen ? 'Cancel scan' : 'Scan to fill'}
        </button>
      </label>

      {/* Manual input */}
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setPreview(null); }}
        placeholder="e.g. LOT-20260526-E3C8CC"
        required={required}
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 font-mono"
      />

      {/* Inline scan widget */}
      {scanOpen && (
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <input
              ref={scanInputRef}
              type="text"
              value={scanBarcode}
              onChange={e => { setScanBarcode(e.target.value); setScanError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleScan(e); } }}
              placeholder="Scan any item barcode from this lot..."
              className="w-full rounded-xl border border-sky-200 dark:border-sky-700/60 bg-sky-50/70 dark:bg-sky-900/20 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
            />
          </div>
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning || !scanBarcode.trim()}
            className="shrink-0 rounded-xl bg-sky-600 dark:bg-sky-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-50"
          >
            {scanning ? '...' : 'Get Lot'}
          </button>
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{scanError}</p>
      )}

      {/* Scan success preview */}
      {preview && (
        <div className="mt-1.5 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            <span className="font-semibold">{preview.productName}</span>
            {' — lot '}<span className="font-mono">{preview.lotNumber}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// ── Single Item ───────────────────────────────────────────────────────────────

function SingleItemForm({ onSuccess, showMessage }: AdjustTabProps) {
  const [barcode, setBarcode] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const mutation = useDurableInventoryMutation<SupplierReturnInput, unknown>('supplier-return-single', (payload, key) => realApi.createReturn(payload, key), () => { showMessage('success', `Item ${barcode} returned successfully`); setBarcode(''); setLotNumber(''); setNotes(''); setItemNotes(''); onSuccess(); });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    mutation.run({
        type: 'supplier_return',
        ...(lotNumber.trim() && { lotNumber: lotNumber.trim() }),
        items: [{ barcode: barcode.trim(), ...(itemNotes.trim() && { notes: itemNotes.trim() }) }],
        ...(notes.trim() && { notes: notes.trim() }),
      });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Barcode *</label>
        <div className="relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <input
            type="text"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            placeholder="Scan or enter barcode..."
            required
            autoFocus
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Item Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={itemNotes}
          onChange={e => setItemNotes(e.target.value)}
          placeholder="e.g. Defective item..."
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
        />
      </div>

      <LotNumberField value={lotNumber} onChange={setLotNumber} />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Return Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Reason for return..."
          rows={3}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 resize-none"
        />
      </div>

      {mutation.error && <p role="alert" className="text-sm text-rose-600">{mutation.error}</p>}
      {mutation.pending && <button type="button" onClick={mutation.retry} disabled={mutation.busy} className="rounded-xl border px-4 py-2 text-sm font-semibold">Retry saved return</button>}
      <SubmitButton loading={mutation.busy} disabled={!mutation.ready || !!mutation.pending || !barcode.trim()} label="Submit Return" />
    </form>
  );
}

// ── Batch Items ───────────────────────────────────────────────────────────────

interface BatchRow { id: number; barcode: string; notes: string }

function BatchItemsForm({ onSuccess, showMessage }: AdjustTabProps) {
  const [rows, setRows] = useState<BatchRow[]>([{ id: 1, barcode: '', notes: '' }]);
  const [lotNumber, setLotNumber] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useDurableInventoryMutation<SupplierReturnInput, unknown>('supplier-return-batch', (payload, key) => realApi.createReturn(payload, key), () => { showMessage('success', 'Items returned successfully'); setRows([{ id: Date.now(), barcode: '', notes: '' }]); setLotNumber(''); setNotes(''); onSuccess(); });

  const updateRow = (id: number, field: keyof Omit<BatchRow, 'id'>, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const addRow = () => setRows(prev => [...prev, { id: Date.now(), barcode: '', notes: '' }]);
  const removeRow = (id: number) => setRows(prev => prev.filter(r => r.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = rows.filter(r => r.barcode.trim());
    if (validItems.length === 0) return;
    mutation.run({
        type: 'supplier_return',
        ...(lotNumber.trim() && { lotNumber: lotNumber.trim() }),
        items: validItems.map(r => ({ barcode: r.barcode.trim(), ...(r.notes.trim() && { notes: r.notes.trim() }) })),
        ...(notes.trim() && { notes: notes.trim() }),
      });
  };

  const hasAnyBarcode = rows.some(r => r.barcode.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Item rows */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Items *</label>
          <span className="text-xs text-slate-400 dark:text-slate-500">{rows.filter(r => r.barcode.trim()).length} valid</span>
        </div>
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={row.id} className="flex gap-2 items-center">
              <div className="relative flex-1">
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <input
                  type="text"
                  value={row.barcode}
                  onChange={e => updateRow(row.id, 'barcode', e.target.value)}
                  placeholder={`Barcode ${idx + 1}`}
                  autoFocus={idx === 0}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                />
              </div>
              <input
                type="text"
                value={row.notes}
                onChange={e => updateRow(row.id, 'notes', e.target.value)}
                placeholder="Notes (optional)"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 transition hover:border-rose-200 dark:hover:border-rose-700/50 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-600 dark:hover:text-sky-400 w-full justify-center"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add row
        </button>
      </div>

      <LotNumberField value={lotNumber} onChange={setLotNumber} />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Return Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Reason for return..."
          rows={3}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 resize-none"
        />
      </div>

      {mutation.error && <p role="alert" className="text-sm text-rose-600">{mutation.error}</p>}
      {mutation.pending && <button type="button" onClick={mutation.retry} disabled={mutation.busy} className="rounded-xl border px-4 py-2 text-sm font-semibold">Retry saved return</button>}
      <SubmitButton loading={mutation.busy} disabled={!mutation.ready || !!mutation.pending || !hasAnyBarcode} label={`Return ${rows.filter(r => r.barcode.trim()).length || ''} Item${rows.filter(r => r.barcode.trim()).length !== 1 ? 's' : ''}`} />
    </form>
  );
}

// ── Lot Return ────────────────────────────────────────────────────────────────

function LotReturnForm({ onSuccess, showMessage }: AdjustTabProps) {
  const [lotNumber, setLotNumber] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useDurableInventoryMutation<SupplierReturnInput, unknown>('supplier-return-lot', (payload, key) => realApi.createReturn(payload, key), () => { showMessage('success', `Lot ${lotNumber} returned successfully`); setLotNumber(''); setNotes(''); onSuccess(); });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotNumber.trim()) return;
    mutation.run({
        type: 'supplier_return',
        lotNumber: lotNumber.trim(),
        ...(notes.trim() && { notes: notes.trim() }),
      });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-amber-200 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-900/10 px-5 py-4">
        <div className="flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-5">
            This will return <span className="font-semibold">all items</span> in the specified lot. This action cannot be undone.
          </p>
        </div>
      </div>

      <LotNumberField value={lotNumber} onChange={setLotNumber} required />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Notes <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Reason for returning the entire lot..."
          rows={3}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50 resize-none"
        />
      </div>

      {mutation.error && <p role="alert" className="text-sm text-rose-600">{mutation.error}</p>}
      {mutation.pending && <button type="button" onClick={mutation.retry} disabled={mutation.busy} className="rounded-xl border px-4 py-2 text-sm font-semibold">Retry saved return</button>}
      <SubmitButton loading={mutation.busy} disabled={!mutation.ready || !!mutation.pending || !lotNumber.trim()} label="Return Entire Lot" danger />
    </form>
  );
}

// ── Shared submit button ──────────────────────────────────────────────────────

function SubmitButton({ loading, disabled, label, danger = false }: { loading: boolean; disabled: boolean; label: string; danger?: boolean }) {
  const base = danger
    ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600'
    : 'bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900';

  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${base}`}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Submitting...
        </>
      ) : label}
    </button>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function AdjustTab({ onSuccess, showMessage }: AdjustTabProps) {
  const [mode, setMode] = useState<ReturnMode>('single');

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </span>
          Inventory Returns
        </div>

        {/* Mode picker */}
        <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-2 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.20)] backdrop-blur">
          <div className="grid grid-cols-3 gap-1">
            {MODES.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={`rounded-[20px] px-3 py-3 text-left transition-all ${
                  mode === m.value
                    ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <p className="text-xs font-semibold">{m.label}</p>
                <p className={`text-[10px] mt-0.5 leading-4 ${mode === m.value ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>{m.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
          <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
          <div className="mb-6">
            <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
              {MODES.find(m => m.value === mode)?.label}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {MODES.find(m => m.value === mode)?.description}
            </p>
          </div>

          {mode === 'single' && <SingleItemForm onSuccess={onSuccess} showMessage={showMessage} />}
          {mode === 'batch'  && <BatchItemsForm  onSuccess={onSuccess} showMessage={showMessage} />}
          {mode === 'lot'    && <LotReturnForm   onSuccess={onSuccess} showMessage={showMessage} />}
        </div>

      </div>
    </div>
  );
}
