import { realApi, type LedgerEntry, type Supplier, type SupplierLedgerSummary } from './api';

function money(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error('A supplier ledger contains an invalid amount.');
  return Math.round(amount * 100);
}

export function summarizeSupplierLedger(
  supplier: Pick<Supplier, 'id' | 'name'>,
  entries: LedgerEntry[],
): SupplierLedgerSummary {
  const totals = entries.reduce(
    (result, entry) => ({
      debit: result.debit + money(entry.debit),
      credit: result.credit + money(entry.credit),
    }),
    { debit: 0, credit: 0 },
  );

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    totalDebit: totals.debit / 100,
    totalCredit: totals.credit / 100,
    balance: (totals.credit - totals.debit) / 100,
  };
}

export async function loadSupplierLedgerSummaries(): Promise<SupplierLedgerSummary[]> {
  const rows = await realApi.getAllSupplierLedgers();
  if (!Array.isArray(rows)) throw new Error('Unable to read supplier balances.');

  return rows.map(row => {
    if (!Number.isInteger(row.supplierId) || !row.supplierName || !Array.isArray(row.ledger)) {
      throw new Error('A supplier balance is incomplete.');
    }
    return summarizeSupplierLedger(
      { id: row.supplierId, name: row.supplierName },
      row.ledger,
    );
  });
}
