import { createReceiptAttempt, readReceiptAttempt, clearReceiptAttempt, canRetryReceiptAttempt, RECEIPT_RETRY_WINDOW_MS } from '../purchase-receipt-attempt';

const order = { id: 25, tenantId: 3 };
describe('receipt recovery storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => '00000000-0000-4000-8000-000000000001' });
  });
  afterEach(() => jest.restoreAllMocks());

  it('persists an immutable request before dispatch and scopes it by business and order', () => {
    const input = { items: [{ purchaseOrderLineId: 101, quantity: 2 }] };
    const attempt = createReceiptAttempt(order, input);
    input.items[0].quantity = 9;
    expect(readReceiptAttempt(order)).toEqual(attempt);
    expect(attempt.input.items[0].quantity).toBe(2);
    expect(readReceiptAttempt({ ...order, tenantId: 4 })).toBeNull();
    expect(() => createReceiptAttempt(order, input)).toThrow('already pending');
    clearReceiptAttempt(order, attempt);
    expect(readReceiptAttempt(order)).toBeNull();
  });

  it('fails before dispatch if recovery storage is unavailable', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(() => createReceiptAttempt(order, { items: [{ purchaseOrderLineId: 101, quantity: 2 }] })).toThrow('Storage blocked');
  });

  it('does not treat corrupted recovery data as a new delivery', () => {
    sessionStorage.setItem('purchase-receipt:3:25', '{"version":1}');
    expect(() => readReceiptAttempt(order)).toThrow('could not be read');
  });

  it('refuses replay after retention expires or the clock moves backwards', () => {
    const attempt = createReceiptAttempt(order, { items: [{ purchaseOrderLineId: 101, quantity: 2 }] });
    expect(canRetryReceiptAttempt(attempt, attempt.createdAt + 1000)).toBe(true);
    expect(canRetryReceiptAttempt(attempt, attempt.createdAt + RECEIPT_RETRY_WINDOW_MS)).toBe(false);
    expect(canRetryReceiptAttempt(attempt, attempt.createdAt - 1)).toBe(false);
  });
});
