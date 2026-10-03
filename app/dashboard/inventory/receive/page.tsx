'use client';

import { useEffect, useState, useCallback } from 'react';
import { Product } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ReceiveTab from '@/app/components/ReceiveTab';
import { getPurchaseCatalog } from '@/lib/purchases';

export default function InventoryReceivePage() {
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
    getPurchaseCatalog()
      .then((response) => { if (active) setProducts(response); })
      .catch(console.error);

    return () => { active = false; };
  }, [token]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manual Stock Receipt</h1>
          <p className="page-subtitle">Receive stock without a purchase order. For an existing order, receive from its purchase order detail page.</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      <ReceiveTab 
        products={products}
        showMessage={showMessage}
      />
    </div>
  );
}
