import { serializedTracking, validateProductTracking, validProductQuantity, formatQuantity } from '../product-quantity';

it('enforces immutable product creation combinations', () => {
  expect(validateProductTracking(serializedTracking)).toBeNull();
  expect(validateProductTracking({ ...serializedTracking, baseUnit: 'kg' })).toMatch(/pieces/);
  expect(validateProductTracking({ trackingMode: 'QUANTITY', baseUnit: 'piece', quantityPrecision: 2 })).toMatch(/whole/);
  expect(validateProductTracking({ trackingMode: 'QUANTITY', baseUnit: 'kg', quantityPrecision: 4 })).toMatch(/0–3/);
});
it('validates decimal quantities without rounding away invalid precision', () => {
  const rice = { trackingMode: 'QUANTITY' as const, baseUnit: 'kg' as const, quantityPrecision: 3 };
  expect(validProductQuantity('2.5', rice)).toBe(true);
  expect(validProductQuantity('0.001', rice)).toBe(true);
  expect(validProductQuantity('0.0001', rice)).toBe(false);
  expect(validProductQuantity('2.5', serializedTracking)).toBe(false);
  expect(validProductQuantity('0', rice)).toBe(false);
  expect(formatQuantity(97.5, 'kg')).toBe('97.5 kg');
});
