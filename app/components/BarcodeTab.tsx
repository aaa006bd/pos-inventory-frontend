'use client';

import { useState, useMemo } from 'react';
import { realApi, BarcodeImageResponse } from '@/lib/api';

interface BarcodeTabProps {
  showMessage: (type: 'success' | 'error', text: string) => void;
}

export default function BarcodeTab({ showMessage }: BarcodeTabProps) {
  const [barcode, setBarcode] = useState('');
  const [barcodeImage, setBarcodeImage] = useState<BarcodeImageResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!barcode) return;
    setLoading(true);
    try {
      const img = await realApi.getBarcodeImage(barcode);
      setBarcodeImage(img);
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed to generate barcode');
      setBarcodeImage(null);
    } finally {
      setLoading(false);
    }
  };

  const svgDataUrl = useMemo(() =>
    barcodeImage ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(barcodeImage.svg)}` : null,
  [barcodeImage]);

  const handleDownload = () => {
    if (!barcodeImage) return;
    const blob = new Blob([barcodeImage.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-${barcode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.08),transparent_30%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_50%,#fff7ed_100%)] dark:bg-none dark:bg-slate-950 p-6">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/80 dark:border-slate-700/70 bg-white/75 dark:bg-slate-800/75 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.4)] backdrop-blur">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-100 text-xs font-semibold text-white dark:text-slate-900">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </span>
          Barcode Generator
        </div>

        {/* Input card */}
        <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
          <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-sky-500 to-orange-400" />
          <div className="mb-6">
            <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
              Generate
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Enter a barcode value to generate a printable SVG</p>
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Barcode value *</label>
              <div className="relative">
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <input
                  type="text"
                  value={barcode}
                  onChange={e => { setBarcode(e.target.value); setBarcodeImage(null); }}
                  placeholder="e.g. INV-20240001"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-700/50 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-sky-400 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !barcode}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 dark:bg-white py-3.5 text-sm font-semibold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Barcode
                </>
              )}
            </button>
          </form>
        </div>

        {/* Preview card */}
        {barcodeImage && (
          <div className="rounded-[28px] border border-white/80 dark:border-slate-700/70 bg-white/88 dark:bg-slate-800/90 p-7 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.30)] backdrop-blur">
            <div className="mb-1.5 h-1 w-10 rounded-full bg-linear-to-r from-orange-400 to-sky-500" />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 mb-1">
                  Preview
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{barcode}</p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/50 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download SVG
              </button>
            </div>

            <div className="flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8">
              {svgDataUrl && (
                // A data URL from the barcode API is intentionally rendered without image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={svgDataUrl}
                  alt={`barcode-${barcode}`}
                  className="w-full h-auto dark:invert"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
