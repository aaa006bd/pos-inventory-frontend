import { checkoutQuantitySummary } from '../checkout-summary';

it('summarizes quantity-only checkout lines', () => {
  expect(checkoutQuantitySummary([{ quantity: 6, baseUnit: 'piece' }], 0)).toBe('6 pieces sold');
});

it('keeps incompatible units separate in a mixed checkout', () => {
  expect(checkoutQuantitySummary([
    { quantity: 2.5, baseUnit: 'kg' },
    { quantity: 1, baseUnit: 'piece' },
    { quantity: 2, baseUnit: 'piece' },
  ], 1)).toBe('2.5 kg · 3 pieces sold');
});

it('falls back to serialized units when line details are unavailable', () => {
  expect(checkoutQuantitySummary([], 1)).toBe('1 piece sold');
});
