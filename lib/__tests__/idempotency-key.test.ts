import { createIdempotencyKey } from '@/lib/idempotency-key';

describe('idempotency key generation', () => {
  it('does not depend on crypto.randomUUID', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });

    try {
      expect(createIdempotencyKey()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: original });
    }
  });

  it('creates a new key for each operation', () => {
    expect(createIdempotencyKey()).not.toBe(createIdempotencyKey());
  });
});
