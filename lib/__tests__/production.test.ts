import { api, type Product } from '../api';
import { productionApi, productionProducts, validateCompletion, validateDefinition, validateProductionPlan, type ProductionDefinition, type ProductionOrder } from '../production';

const product = (id: number, name: string, baseUnit: 'piece' | 'kg', quantityPrecision: number, trackingMode: 'QUANTITY' | 'SERIALIZED' = 'QUANTITY') => ({ id, name, baseUnit, quantityPrecision, trackingMode, active: true } as Product);
const products = [product(1, 'Bread', 'piece', 0), product(2, 'Flour', 'kg', 3), product(3, 'Tray', 'piece', 0, 'SERIALIZED')];
const definition: ProductionDefinition = { id: 7, outputProductId: 1, version: 2, name: 'Bread', outputQuantity: 10, outputUnit: 'piece', active: true, components: [{ id: 9, productId: 2, quantity: 1.5, baseUnit: 'kg' }] };
const order: ProductionOrder = { id: 12, definitionId: 7, definitionVersion: 2, outputProductId: 1, outputUnit: 'piece', plannedQuantity: 20, actualQuantity: null, status: 'PLANNED', materialCost: null, journalEntryId: null, notes: null, materials: [{ id: 20, productId: 2, baseUnit: 'kg', plannedQuantity: 3, actualQuantity: null, actualCost: null }] };

afterEach(() => jest.restoreAllMocks());

it('uses every documented production endpoint and sends the canonical idempotency header', async () => {
  const get = jest.spyOn(api, 'get'); const post = jest.spyOn(api, 'post');
  get.mockResolvedValueOnce({ items: [definition], total: '1', page: '1', limit: '20' }).mockResolvedValueOnce(definition).mockResolvedValueOnce({ items: [order], total: 1, page: 1, limit: 20 }).mockResolvedValueOnce(order);
  post.mockResolvedValueOnce(definition).mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, status: 'COMPLETED', actualQuantity: 19 });
  expect((await productionApi.listDefinitions({ page: 1 })).page).toBe(1);
  await productionApi.getDefinition(7);
  await productionApi.createDefinition({ name: 'Bread', outputProductId: 1, outputQuantity: 10, components: [{ productId: 2, quantity: 1.5 }] });
  await productionApi.listOrders({ page: 1, status: 'PLANNED' });
  await productionApi.getOrder(12);
  await productionApi.createOrder({ definitionId: 7, plannedQuantity: 20 });
  const completion = { actualQuantity: 19, materials: [{ productId: 2, quantity: 3.1 }] };
  await productionApi.completeOrder(12, completion, 'production-key');
  expect(get).toHaveBeenNthCalledWith(1, '/production/definitions', { page: 1, limit: 20, outputProductId: undefined });
  expect(get).toHaveBeenNthCalledWith(3, '/production/orders', { page: 1, limit: 20, status: 'PLANNED' });
  expect(post).toHaveBeenLastCalledWith('/production/orders/12/complete', completion, { headers: { 'Idempotency-Key': 'production-key' } });
});

it('allows only active quantity products and validates product precision', () => {
  expect(productionProducts(products).map(item => item.id)).toEqual([1, 2]);
  const valid = { name: 'Bread', outputProductId: 1, outputQuantity: 10, components: [{ productId: 2, quantity: 1.25 }] };
  expect(validateDefinition(valid, products)).toBeNull();
  expect(validateDefinition({ ...valid, outputQuantity: 1.5 }, products)).toContain('piece');
  expect(validateDefinition({ ...valid, components: [{ productId: 3, quantity: 1 }] }, products)).toContain('quantity-tracked');
  expect(validateDefinition({ ...valid, components: [{ productId: 2, quantity: 1 }, { productId: 2, quantity: 1 }] }, products)).toContain('only once');
  expect(validateProductionPlan({ definitionId: 7, plannedQuantity: 20 }, definition, products[0])).toBeNull();
});

it('requires every planned material exactly once and at least one consumed amount', () => {
  expect(validateCompletion(order, { actualQuantity: 19, materials: [{ productId: 2, quantity: 3.1 }] }, products)).toBeNull();
  expect(validateCompletion(order, { actualQuantity: 19, materials: [] }, products)).toContain('every planned material');
  expect(validateCompletion(order, { actualQuantity: 19, materials: [{ productId: 2, quantity: 0 }] }, products)).toContain('greater than zero');
  expect(validateCompletion({ ...order, status: 'COMPLETED' }, { actualQuantity: 19, materials: [{ productId: 2, quantity: 3 }] }, products)).toContain('already completed');
});
