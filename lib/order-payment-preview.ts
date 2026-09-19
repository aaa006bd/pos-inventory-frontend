import { paymentCents } from './customer-payments';
import type { SaleRecord } from './sales-orders';

// Informational only: the server validates current balances and returns actual allocations.
export function previewOrderPayment(sales: SaleRecord[], amount: string) {
  let remaining = paymentCents(amount) ?? 0;
  return sales.filter(sale => sale.status === 'COMPLETED' && sale.paymentMethod === 'CREDIT' && Number(sale.outstandingAmount) > 0)
    .sort((a, b) => Date.parse(a.soldAt) - Date.parse(b.soldAt) || a.id - b.id)
    .map(sale => {
      const balance = paymentCents(sale.outstandingAmount) ?? 0;
      const applied = Math.min(balance, remaining);
      remaining -= applied;
      return { sale, applied: applied / 100, remaining: (balance - applied) / 100 };
    });
}
