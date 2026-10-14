import type { BaseUnit } from './product-quantity';

export interface CheckoutSummaryLine {
  quantity: number;
  baseUnit: BaseUnit;
}

const unitLabel = (unit: BaseUnit, quantity: number) => {
  if (unit === 'piece') return quantity === 1 ? 'piece' : 'pieces';
  if (unit === 'litre') return quantity === 1 ? 'litre' : 'litres';
  if (unit === 'metre') return quantity === 1 ? 'metre' : 'metres';
  return 'kg';
};

export function checkoutQuantitySummary(lines: CheckoutSummaryLine[], serializedCount: number) {
  const totals = new Map<BaseUnit, number>();
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (Number.isFinite(quantity) && quantity > 0) totals.set(line.baseUnit, (totals.get(line.baseUnit) ?? 0) + quantity);
  }
  if (!totals.size && serializedCount > 0) totals.set('piece', serializedCount);
  if (!totals.size) return 'Sale completed';
  const quantities = [...totals].map(([unit, quantity]) => `${quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unitLabel(unit, quantity)}`);
  return `${quantities.join(' · ')} sold`;
}
