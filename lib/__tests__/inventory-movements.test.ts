import { api } from '../api';
import { emptyMovementFilters, getInventoryMovements, movementDelta, movementQuery, movementSourceLink, type InventoryMovement } from '../inventory-movements';

afterEach(() => jest.restoreAllMocks());
it('accepts a null aggregate when movements have mixed units', async () => {
  jest.spyOn(api, 'get').mockResolvedValue({ items: [], page: 1, limit: 20, total: 2, netQuantityDelta: null, netQuantityByUnit: { kg: -2.5, piece: -1 } });
  const data = await getInventoryMovements(emptyMovementFilters, 1);
  expect(data.netQuantityDelta).toBeNull();
  expect(data.netQuantityByUnit).toEqual({ kg: -2.5, piece: -1 });
});
it('builds optional filters and local whole-day boundaries', () => {
  const query = movementQuery({ ...emptyMovementFilters, productId: '4', from: '2026-09-01', to: '2026-09-02' }, 2);
  expect(query).toMatchObject({ page: 2, limit: 20, productId: 4, type: undefined });
  expect(new Date(query.from!).getHours()).toBe(0);
  expect(new Date(query.to!).getHours()).toBe(23);
  expect(() => movementQuery({ ...emptyMovementFilters, from: '2026-09-03', to: '2026-09-02' }, 1)).toThrow(/Start date/);
});
it('keeps the server total delta rather than summing the current page', async () => {
  jest.spyOn(api, 'get').mockResolvedValue({ items: [], page: 1, limit: 20, total: 40, netQuantityDelta: -12, netQuantityByUnit: { piece: -12 } });
  expect((await getInventoryMovements(emptyMovementFilters, 1)).netQuantityDelta).toBe(-12);
});
it('links only supported destinations and labels status-only movements', () => {
  expect(movementSourceLink({ referenceType: 'SALES_RECORD', referenceId: 3 } as InventoryMovement)).toBe('/dashboard/sales/records/3');
  expect(movementSourceLink({ referenceType: 'INVENTORY_RETURN', referenceId: 3 } as InventoryMovement)).toBeUndefined();
  expect(movementDelta(0)).toBe('0 Status change');
  expect(movementDelta(-1)).toBe('-1 Out');
});
