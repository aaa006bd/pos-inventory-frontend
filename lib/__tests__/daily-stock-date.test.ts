import { dailyStockBusinessDate, formatDailyStockDate } from '../daily-stock-date';

it('uses the Bangladesh calendar date during the early-morning UTC boundary', () => {
  expect(dailyStockBusinessDate(new Date('2026-10-14T21:29:32Z'))).toBe('2026-10-15');
  expect(dailyStockBusinessDate(new Date('2026-10-15T17:59:59Z'))).toBe('2026-10-15');
  expect(dailyStockBusinessDate(new Date('2026-10-15T18:00:00Z'))).toBe('2026-10-16');
});

it('formats the selected business date without shifting it for the browser timezone', () => {
  expect(formatDailyStockDate('2026-10-15')).toBe('Thursday, October 15, 2026');
});
