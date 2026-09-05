'use client';

import { useState, useEffect, useCallback } from 'react';
import { realApi, Lot, LotBarcodeItem } from '@/lib/api';

interface BulkBarcodeTabProps {
  showMessage: (type: 'success' | 'error', text: string) => void;
}

type PrinterStatus = 'checking' | 'ready' | 'no-printer' | 'qz-offline';

const STATUS_STYLES: Record<string, string> = {
  in_stock: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  sold: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
  returned: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  damaged: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

const PRINTER_NAME = 'RP3xx Series 200DPI TSPL';

// Security callbacks must be configured once per qz module lifetime.
// Re-setting them on each call triggers a new trust prompt in QZ Tray.
let qzSecurityConfigured = false;

async function getQz() {
  const { default: qz } = await import('qz-tray');
  if (!qzSecurityConfigured) {
    qz.security.setCertificatePromise((resolve) => resolve(''));
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise(() => (resolve) => resolve(''));
    qzSecurityConfigured = true;
  }
  return qz;
}

async function checkPrinterStatus(): Promise<PrinterStatus> {
  try {
    const qz = await getQz();
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 1, delay: 1 });
    }
    await qz.printers.find(PRINTER_NAME);
    return 'ready';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('unable to establish') || msg.toLowerCase().includes('websocket')) {
      return 'qz-offline';
    }
    return 'no-printer';
  }
}

export default function BulkBarcodeTab({ showMessage }: BulkBarcodeTabProps) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [expandedLots, setExpandedLots] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>('checking');

  useEffect(() => {
    checkPrinterStatus().then(setPrinterStatus);
  }, []);

  useEffect(() => {
    realApi.getLots({ limit: 100 })
      .then(res => setLots(res.items))
      .catch(err => showMessage('error', err instanceof Error ? err.message : 'Failed to load lots'))
      .finally(() => setLoadingLots(false));
  }, [showMessage]);

  const toggleLotExpand = (lotId: number) => {
    setExpandedLots(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };

  const getLotSelectionState = (items: LotBarcodeItem[]): 'none' | 'partial' | 'all' => {
    const count = items.filter(i => selected.has(i.barcode)).length;
    if (count === 0) return 'none';
    if (count === items.length) return 'all';
    return 'partial';
  };

  const toggleLotAll = useCallback((items: LotBarcodeItem[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = items.every(i => next.has(i.barcode));
      if (allSelected) {
        items.forEach(i => next.delete(i.barcode));
      } else {
        items.forEach(i => next.add(i.barcode));
      }
      return next;
    });
  }, []);

  const toggleBarcode = useCallback((barcode: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(barcode)) next.delete(barcode);
      else next.add(barcode);
      return next;
    });
  }, []);

  const handlePrint = async () => {
    if (selected.size === 0) return;
    setPrinting(true);
    try {
      const barcodes = Array.from(selected);
      const { images } = await realApi.getBarcodeImages(barcodes);

      const printData = barcodes.map((_, i) => {
        const svg = images[i];
        const html = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{width:38mm;height:28mm;display:flex;align-items:center;justify-content:center;overflow:hidden}img{max-width:100%;max-height:100%}</style></head><body><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"/></body></html>`;
        return { type: 'pixel' as const, format: 'html' as const, flavor: 'plain' as const, data: html };
      });

      const qz = await getQz();
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 2, delay: 1 });
      }
      const printer = await qz.printers.find(PRINTER_NAME);
      const config = qz.configs.create(printer, {
        size: { width: 38, height: 28 },
        units: 'mm',
        colorType: 'blackwhite',
      });
      await qz.print(config, printData);
      showMessage('success', `Sent ${selected.size} label${selected.size !== 1 ? 's' : ''} to printer`);
      setPrinterStatus('ready');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Print failed — is QZ Tray running?');
      checkPrinterStatus().then(setPrinterStatus);
    } finally {
      setPrinting(false);
    }
  };

  const handleRecheck = () => {
    setPrinterStatus('checking');
    checkPrinterStatus().then(setPrinterStatus);
  };

  if (loadingLots) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading lots…
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
        </svg>
        <p className="text-sm">No lots found</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6 pb-28">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Header row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17H17.01M7 7H7.01M3 9l4-4 4 4m6 6l4-4-4-4" />
              </svg>
            </span>
            Bulk Barcode Printer
            <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {lots.length} lots
            </span>
          </div>

          <PrinterStatusBadge status={printerStatus} onRecheck={handleRecheck} />
        </div>

        {/* Lot cards */}
        {lots.map(lot => {
          const state = getLotSelectionState(lot.items);
          const isExpanded = expandedLots.has(lot.id);

          return (
            <div
              key={lot.id}
              className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.20)] backdrop-blur overflow-hidden"
            >
              {/* Lot header */}
              <div className="p-5 flex items-start gap-4">
                <button
                  onClick={() => toggleLotAll(lot.items)}
                  className="mt-0.5 shrink-0 h-5 w-5 rounded-[5px] border-2 flex items-center justify-center transition
                    border-slate-300 dark:border-slate-600
                    data-[state=all]:border-sky-500 data-[state=all]:bg-sky-500
                    data-[state=partial]:border-sky-400 data-[state=partial]:bg-sky-100 dark:data-[state=partial]:bg-sky-900/40"
                  data-state={state}
                  aria-label={`Select all in ${lot.lotNumber}`}
                >
                  {state === 'all' && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {state === 'partial' && (
                    <span className="w-2.5 h-0.5 rounded bg-sky-500 dark:bg-sky-400" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-mono">
                      {lot.lotNumber}
                    </span>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {lot.itemCount} items
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {lot.productName} &middot; <span className="font-mono">{lot.sku}</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Supplier: {lot.supplierName}
                  </p>
                </div>

                <button
                  onClick={() => toggleLotExpand(lot.id)}
                  className="shrink-0 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Barcode list */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-700/60 divide-y divide-slate-100 dark:divide-slate-700/40">
                  {lot.items.map(item => {
                    const isChecked = selected.has(item.barcode);
                    const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.sold;

                    return (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                        <button
                          onClick={() => toggleBarcode(item.barcode)}
                          className={`shrink-0 h-5 w-5 rounded-[5px] border-2 flex items-center justify-center transition
                            ${isChecked
                              ? 'border-sky-500 bg-sky-500'
                              : 'border-slate-300 dark:border-slate-600 hover:border-sky-400'}`}
                          aria-label={`Select ${item.barcode}`}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <span className="flex-1 font-mono text-sm text-slate-800 dark:text-slate-200">
                          {item.barcode}
                        </span>

                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {selected.size === 0 ? (
              <span>No barcodes selected</span>
            ) : (
              <span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selected.size}</span> barcode{selected.size !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <PrinterStatusBadge status={printerStatus} onRecheck={handleRecheck} compact />
        </div>

        <button
          onClick={handlePrint}
          disabled={selected.size === 0 || printing || printerStatus !== 'ready'}
          className="flex items-center gap-2 rounded-2xl bg-slate-950 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
        >
          {printing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Printing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print {selected.size > 0 ? `${selected.size} Label${selected.size !== 1 ? 's' : ''}` : 'Labels'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Printer status badge ────────────────────────────────────────────────────

interface PrinterStatusBadgeProps {
  status: PrinterStatus;
  onRecheck: () => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<PrinterStatus, { dot: string; label: string; hint: string }> = {
  checking:    { dot: 'bg-slate-400 animate-pulse', label: 'Checking printer…',  hint: '' },
  ready:       { dot: 'bg-emerald-500',             label: 'Printer ready',       hint: PRINTER_NAME },
  'no-printer':{ dot: 'bg-amber-500',               label: 'Printer not found',   hint: `"${PRINTER_NAME}" not detected — is it on?` },
  'qz-offline':{ dot: 'bg-red-500',                 label: 'QZ Tray offline',     hint: 'Start QZ Tray on this computer' },
};

function PrinterStatusBadge({ status, onRecheck, compact }: PrinterStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const showRetry = status !== 'checking' && status !== 'ready';

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        <span>{cfg.label}</span>
        {showRetry && (
          <button onClick={onRecheck} className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200 transition">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border backdrop-blur transition-all ${
      status === 'ready'       ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300'
      : status === 'checking'  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
      : status === 'no-printer'? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/60 text-amber-700 dark:text-amber-300'
      :                          'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/60 text-red-700 dark:text-red-300'
    }`}>
      <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
      <span>{cfg.label}</span>
      {cfg.hint && <span className="opacity-60 max-w-45 truncate hidden sm:inline">{cfg.hint}</span>}
      {showRetry && (
        <button onClick={onRecheck} className="ml-1 flex items-center gap-1 opacity-70 hover:opacity-100 transition" title="Re-check">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      )}
    </div>
  );
}
