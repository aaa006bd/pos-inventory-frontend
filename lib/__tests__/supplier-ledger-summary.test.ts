import { realApi, type LedgerEntry, type Supplier } from '../api';
import { loadSupplierLedgerSummaries, summarizeSupplierLedger } from '../supplier-ledger-summary';

const supplier = { id: 7, name: 'Bakery Ingredients' } as Supplier;
const entries: LedgerEntry[] = [
  { date: '2026-10-14', reference: 'PO-1', description: 'Flour', debit: 0, credit: 300, balance: 300 },
  { date: '2026-10-14', reference: 'PO-1', description: 'Sugar', debit: 0, credit: 200, balance: 500 },
];

afterEach(() => jest.restoreAllMocks());

it('derives the supplier summary from the same ledger entries shown in detail', () => {
  expect(summarizeSupplierLedger(supplier, entries)).toEqual({
    supplierId: 7,
    supplierName: 'Bakery Ingredients',
    totalDebit: 0,
    totalCredit: 500,
    balance: 500,
  });
});

it('reconciles partial and full supplier payments', () => {
  expect(summarizeSupplierLedger(supplier, [
    ...entries,
    { date: '2026-10-15', reference: 'PAY-1', description: 'Partial payment', debit: 125, credit: 0, balance: 375 },
  ]).balance).toBe(375);
  expect(summarizeSupplierLedger(supplier, [
    ...entries,
    { date: '2026-10-15', reference: 'PAY-2', description: 'Full payment', debit: 500, credit: 0, balance: 0 },
  ]).balance).toBe(0);
});

it('normalizes the aggregate endpoint ledger instead of treating missing totals as zero', async () => {
  jest.spyOn(realApi, 'getAllSupplierLedgers').mockResolvedValue([{
    supplierId: supplier.id,
    supplierName: supplier.name,
    ledger: entries,
  }]);
  const result = await loadSupplierLedgerSummaries();
  expect(result[0].balance).toBe(500);
});

it('rejects incomplete ledger data rather than displaying a false zero', async () => {
  jest.spyOn(realApi, 'getAllSupplierLedgers').mockResolvedValue([{
    supplierId: supplier.id,
    supplierName: supplier.name,
    ledger: undefined as unknown as LedgerEntry[],
  }]);
  await expect(loadSupplierLedgerSummaries()).rejects.toThrow('incomplete');
});
