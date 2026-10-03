export type TrackingMode = 'SERIALIZED' | 'QUANTITY';
export const baseUnits = ['piece', 'kg', 'litre', 'metre'] as const;
export type BaseUnit = typeof baseUnits[number];
export interface ProductTracking { trackingMode: TrackingMode; baseUnit: BaseUnit; quantityPrecision: number }
export const serializedTracking: ProductTracking = { trackingMode: 'SERIALIZED', baseUnit: 'piece', quantityPrecision: 0 };

export function validateProductTracking(value: ProductTracking): string | null {
  if (!['SERIALIZED', 'QUANTITY'].includes(value.trackingMode)) return 'Choose a tracking mode.';
  if (!baseUnits.includes(value.baseUnit)) return 'Choose a supported base unit.';
  if (!Number.isInteger(value.quantityPrecision) || value.quantityPrecision < 0 || value.quantityPrecision > 3) return 'Quantity precision must be 0–3 decimal places.';
  if (value.trackingMode === 'SERIALIZED' && value.baseUnit !== 'piece') return 'Serialized products must use pieces.';
  if ((value.trackingMode === 'SERIALIZED' || value.baseUnit === 'piece') && value.quantityPrecision !== 0) return 'Pieces require whole quantities (precision 0).';
  return null;
}
export function validProductQuantity(value: string | number, product: ProductTracking) {
  if (validateProductTracking(product)) return false;
  const text = String(value);
  if (!/^\d+(\.\d+)?$/.test(text) || Number(text) <= 0) return false;
  const decimals = text.split('.')[1]?.replace(/0+$/, '').length ?? 0;
  return decimals <= product.quantityPrecision && Number.isSafeInteger(Math.round(Number(text) * 1000));
}
export function formatQuantity(value: number, unit: BaseUnit) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit}`;
}
