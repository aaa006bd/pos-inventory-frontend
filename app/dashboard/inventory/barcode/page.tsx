'use client';

import { Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import BarcodeTab from '@/app/components/BarcodeTab';
import BulkBarcodeTab from '@/app/components/BulkBarcodeTab';

type Tab = 'single' | 'bulk';

export default function InventoryBarcodePage() {
  return <Suspense fallback={<p>Loading barcodes…</p>}><InventoryBarcodeRoute /></Suspense>;
}

function InventoryBarcodeRoute() {
  const lotNumber = useSearchParams().get('lotNumber') ?? '';
  return <InventoryBarcodeContent key={lotNumber} lotNumber={lotNumber} />;
}

function InventoryBarcodeContent({ lotNumber }: { lotNumber: string }) {
  const [activeTab, setActiveTab] = useState<Tab>(lotNumber ? 'bulk' : 'single');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Barcode</h1>
          <p className="page-subtitle">Generate and print barcode labels</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Tab switcher */}
      <div className="mb-6 inline-flex rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 p-1 gap-1">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'single'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Single
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
            activeTab === 'bulk'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Bulk Print
        </button>
      </div>

      {activeTab === 'single' ? (
        <BarcodeTab showMessage={showMessage} />
      ) : (
        <BulkBarcodeTab showMessage={showMessage} lotNumber={lotNumber || undefined} />
      )}
    </div>
  );
}
