import { dashboardPageTitle } from '../dashboard-title';

it('shows the section name instead of a numeric record ID in the banner', () => {
  expect(dashboardPageTitle('/dashboard/inventory/balances/10', 'Stock Overview')).toBe('Stock Overview');
  expect(dashboardPageTitle('/dashboard/production/orders/24', 'Production Orders')).toBe('Production Orders');
});

it('keeps existing labels for non-record pages', () => {
  expect(dashboardPageTitle('/dashboard/inventory/daily-stock', 'Daily Stock')).toBe('Daily Stock');
});
