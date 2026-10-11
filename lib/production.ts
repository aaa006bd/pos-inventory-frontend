import { api } from './api';
import { validProductQuantity, type BaseUnit, type ProductTracking } from './product-quantity';
import type { Product } from './api';

export type ProductionOrderStatus = 'PLANNED' | 'COMPLETED';

export interface ProductionDefinitionLine {
  id: number;
  productId: number;
  quantity: number;
  baseUnit: BaseUnit;
}

export interface ProductionDefinition {
  id: number;
  outputProductId: number;
  version: number;
  name: string;
  outputQuantity: number;
  outputUnit: BaseUnit;
  active: boolean;
  components: ProductionDefinitionLine[];
}

export interface ProductionMaterial {
  id: number;
  productId: number;
  baseUnit: BaseUnit;
  plannedQuantity: number;
  actualQuantity: number | null;
  actualCost: number | null;
}

export interface ProductionOrder {
  id: number;
  definitionId: number;
  definitionVersion: number;
  outputProductId: number;
  outputUnit: BaseUnit;
  plannedQuantity: number;
  actualQuantity: number | null;
  status: ProductionOrderStatus;
  materialCost: number | null;
  journalEntryId: number | null;
  notes: string | null;
  materials: ProductionMaterial[];
}

export interface ProductionPage<T> { items: T[]; total: number; page: number; limit: number }
export interface CreateDefinitionInput { name: string; outputProductId: number; outputQuantity: number; components: { productId: number; quantity: number }[] }
export interface CreateProductionOrderInput { definitionId: number; plannedQuantity: number; notes?: string }
export interface CompleteProductionOrderInput { actualQuantity: number; materials: { productId: number; quantity: number }[]; notes?: string }

type RawPage<T> = Omit<ProductionPage<T>, 'total' | 'page' | 'limit'> & { total: number | string; page: number | string; limit: number | string };

function normalizeNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value);
}

function normalizeDefinition(value: ProductionDefinition): ProductionDefinition {
  return {
    ...value,
    id: normalizeNumber(value.id),
    outputProductId: normalizeNumber(value.outputProductId),
    version: normalizeNumber(value.version),
    outputQuantity: normalizeNumber(value.outputQuantity),
    components: value.components.map(line => ({ ...line, id: normalizeNumber(line.id), productId: normalizeNumber(line.productId), quantity: normalizeNumber(line.quantity) })),
  };
}

function normalizeOrder(value: ProductionOrder): ProductionOrder {
  return {
    ...value,
    id: normalizeNumber(value.id),
    definitionId: normalizeNumber(value.definitionId),
    definitionVersion: normalizeNumber(value.definitionVersion),
    outputProductId: normalizeNumber(value.outputProductId),
    plannedQuantity: normalizeNumber(value.plannedQuantity),
    actualQuantity: value.actualQuantity == null ? null : normalizeNumber(value.actualQuantity),
    materialCost: value.materialCost == null ? null : normalizeNumber(value.materialCost),
    journalEntryId: value.journalEntryId == null ? null : normalizeNumber(value.journalEntryId),
    materials: value.materials.map(line => ({ ...line, id: normalizeNumber(line.id), productId: normalizeNumber(line.productId), plannedQuantity: normalizeNumber(line.plannedQuantity), actualQuantity: line.actualQuantity == null ? null : normalizeNumber(line.actualQuantity), actualCost: line.actualCost == null ? null : normalizeNumber(line.actualCost) })),
  };
}

function normalizePage<T>(value: RawPage<T>, normalizeItem: (item: T) => T): ProductionPage<T> {
  const result = { items: Array.isArray(value?.items) ? value.items.map(normalizeItem) : [], total: normalizeNumber(value?.total), page: normalizeNumber(value?.page), limit: normalizeNumber(value?.limit) };
  if (!Array.isArray(value?.items) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.page) || result.page < 1 || !Number.isInteger(result.limit) || result.limit < 1) throw new Error('The production list response could not be read.');
  return result;
}

export const productionApi = {
  listDefinitions: async (query: { page: number; limit?: number; outputProductId?: number }) => normalizePage(await api.get<RawPage<ProductionDefinition>>('/production/definitions', { page: query.page, limit: query.limit ?? 20, outputProductId: query.outputProductId }), normalizeDefinition),
  getDefinition: async (id: number) => normalizeDefinition(await api.get<ProductionDefinition>(`/production/definitions/${id}`)),
  createDefinition: async (input: CreateDefinitionInput) => normalizeDefinition(await api.post<ProductionDefinition>('/production/definitions', input)),
  listOrders: async (query: { page: number; limit?: number; status?: ProductionOrderStatus }) => normalizePage(await api.get<RawPage<ProductionOrder>>('/production/orders', { page: query.page, limit: query.limit ?? 20, status: query.status }), normalizeOrder),
  getOrder: async (id: number) => normalizeOrder(await api.get<ProductionOrder>(`/production/orders/${id}`)),
  createOrder: async (input: CreateProductionOrderInput) => normalizeOrder(await api.post<ProductionOrder>('/production/orders', input)),
  completeOrder: async (id: number, input: CompleteProductionOrderInput, idempotencyKey: string) => normalizeOrder(await api.post<ProductionOrder>(`/production/orders/${id}/complete`, input, { headers: { 'Idempotency-Key': idempotencyKey } })),
};

export async function getActiveDefinitions() {
  const definitions: ProductionDefinition[] = [];
  let page = 1;
  while (page <= 100) {
    const response = await productionApi.listDefinitions({ page, limit: 100 });
    definitions.push(...response.items.filter(definition => definition.active));
    if (page * response.limit >= response.total) return definitions;
    page += 1;
  }
  throw new Error('Too many production definition pages to load safely.');
}

function productTracking(product: Product): ProductTracking | null {
  return product.trackingMode && product.baseUnit && product.quantityPrecision != null
    ? { trackingMode: product.trackingMode, baseUnit: product.baseUnit, quantityPrecision: product.quantityPrecision }
    : null;
}

export function productionProducts(products: Product[]) {
  return products.filter(product => product.active !== false && product.trackingMode === 'QUANTITY');
}

export function validateDefinition(input: CreateDefinitionInput, products: Product[]) {
  if (!input.name.trim()) return 'Enter a recipe or bill of materials name.';
  const output = products.find(product => product.id === input.outputProductId);
  const outputTracking = output && productTracking(output);
  if (!output || !outputTracking || outputTracking.trackingMode !== 'QUANTITY') return 'Select an active quantity-tracked finished product.';
  if (!validProductQuantity(input.outputQuantity, outputTracking)) return `Enter a valid output quantity in ${outputTracking.baseUnit}.`;
  if (!input.components.length) return 'Add at least one material.';
  const seen = new Set<number>();
  for (const component of input.components) {
    const product = products.find(item => item.id === component.productId);
    const tracking = product && productTracking(product);
    if (!product || !tracking || tracking.trackingMode !== 'QUANTITY') return 'Select an active quantity-tracked product for every material.';
    if (component.productId === input.outputProductId) return 'The finished product cannot also be a material.';
    if (seen.has(component.productId)) return 'Each material can appear only once.';
    seen.add(component.productId);
    if (!validProductQuantity(component.quantity, tracking)) return `Enter a valid material quantity for ${product.name} in ${tracking.baseUnit}.`;
  }
  return null;
}

export function validateProductionPlan(input: CreateProductionOrderInput, definition: ProductionDefinition | undefined, outputProduct: Product | undefined) {
  if (!definition || !definition.active || input.definitionId !== definition.id) return 'Select an active production definition.';
  const tracking = outputProduct && productTracking(outputProduct);
  if (!tracking || !validProductQuantity(input.plannedQuantity, tracking)) return `Enter a valid planned quantity in ${definition.outputUnit}.`;
  if ((input.notes?.length ?? 0) > 1000) return 'Notes must be 1,000 characters or fewer.';
  return null;
}

export function validateCompletion(order: ProductionOrder, input: CompleteProductionOrderInput, products: Product[]) {
  if (order.status !== 'PLANNED') return 'This production order is already completed.';
  const output = products.find(product => product.id === order.outputProductId);
  const outputTracking = output && productTracking(output);
  if (!outputTracking || !validProductQuantity(input.actualQuantity, outputTracking)) return `Enter a valid finished quantity in ${order.outputUnit}.`;
  if (input.materials.length !== order.materials.length) return 'Include every planned material exactly once.';
  const plannedIds = new Set(order.materials.map(material => material.productId));
  const seen = new Set<number>();
  let consumed = false;
  for (const material of input.materials) {
    if (!plannedIds.has(material.productId) || seen.has(material.productId)) return 'Include every planned material exactly once.';
    seen.add(material.productId);
    const product = products.find(item => item.id === material.productId);
    const tracking = product && productTracking(product);
    if (!tracking || material.quantity < 0 || (material.quantity > 0 && !validProductQuantity(material.quantity, tracking))) return `Enter a valid actual material quantity for ${product?.name ?? `product #${material.productId}`}.`;
    if (material.quantity > 0) consumed = true;
  }
  if (!consumed) return 'At least one material quantity must be greater than zero.';
  if ((input.notes?.length ?? 0) > 1000) return 'Notes must be 1,000 characters or fewer.';
  return null;
}

export function formatProductionAmount(value: number | null) {
  return value == null ? '—' : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
