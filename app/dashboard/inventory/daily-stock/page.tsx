'use client';

import { useEffect, useState, useCallback } from 'react';
import { realApi, Product } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import DailyStockTab from '@/app/components/DailyStockTab';

export default function InventoryDailyStockPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    if (!token) return;

    let active = true;
    realApi.getProducts()
      .then((response) => {
        if (active) setProducts(response.data || response);
      })
      .catch(console.error);

    return () => { active = false; };
  }, [token]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Stock Report</h1>
          <p className="page-subtitle">View daily stock levels</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      <DailyStockTab products={products} showMessage={showMessage} />
    </div>
  );
}
