import { averageStockCost, currentSellingPrice } from '../stock-pricing';

it('derives average cost from backend stock value, not the last purchase price', () => {
  expect(averageStockCost({ quantity: 97.5, stockValue: 4875 })).toBe(50);
  expect(averageStockCost({ quantity: 0, stockValue: 0 })).toBeNull();
});

it('shows a missing selling price as unavailable rather than zero', () => {
  expect(currentSellingPrice(undefined)).toBeNull();
  expect(currentSellingPrice({ basePrice: null })).toBeNull();
  expect(currentSellingPrice({ basePrice: '65.00' })).toBe(65);
  expect(currentSellingPrice({ basePrice: 0 })).toBe(0);
});
