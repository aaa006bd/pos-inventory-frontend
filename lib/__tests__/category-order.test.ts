import { sortCategoriesNewestFirst } from '../category-order';

it('orders categories newest first without mutating the API response', () => {
  const categories = [
    { id: 2, createdAt: '2026-10-12T10:00:00Z' },
    { id: 3, createdAt: '2026-10-14T10:00:00Z' },
    { id: 1, createdAt: '2026-10-10T10:00:00Z' },
  ];

  expect(sortCategoriesNewestFirst(categories).map(category => category.id)).toEqual([3, 2, 1]);
  expect(categories.map(category => category.id)).toEqual([2, 3, 1]);
});

it('uses descending IDs when timestamps are unavailable', () => {
  expect(sortCategoriesNewestFirst([{ id: 4 }, { id: 9 }, { id: 6 }]).map(category => category.id)).toEqual([9, 6, 4]);
});
