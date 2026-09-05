import { AUTH_UNAUTHORIZED_EVENT, ApiError, api, realApi } from '../api';

const fetchMock = jest.fn();

Object.defineProperty(global, 'fetch', {
  configurable: true,
  writable: true,
  value: fetchMock,
});

function mockResponse({
  body = '',
  ok = true,
  status = 200,
  statusText = 'OK',
  contentLength,
}: {
  body?: string;
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentLength?: string;
}) {
  return {
    ok,
    status,
    statusText,
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-length' ? contentLength ?? null : null,
    },
    text: jest.fn().mockResolvedValue(body),
    blob: jest.fn().mockResolvedValue(new Blob([body])),
  } as unknown as Response;
}

describe('API client', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
  });

  it('adds query parameters and a normalized bearer token', async () => {
    localStorage.setItem('token', 'test-token');
    fetchMock.mockResolvedValue(
      mockResponse({ body: JSON.stringify({ items: [] }) }),
    );

    await api.get('/inventory/items', { page: 2, active: true, omitted: undefined });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/backend-api/inventory/items?page=2&active=true');
    expect(String(url)).not.toContain('omitted');
    expect((options?.headers as Headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('returns text without trying to parse JSON', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ body: '<svg>barcode</svg>' }),
    );

    await expect(api.getText('/inventory/barcode/ABC/image')).resolves.toBe('<svg>barcode</svg>');
  });

  it('supports successful responses with no body', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ status: 204, statusText: 'No Content' }),
    );

    await expect(api.delete<void>('/products/1')).resolves.toBeUndefined();
  });

  it('normalizes nullable attribute options from the backend', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({
        body: JSON.stringify([
          {
            id: 1,
            name: 'Warranty',
            type: 'NUMBER',
            unit: 'months',
            options: null,
            required: false,
            categoryId: 2,
          },
        ]),
      }),
    );

    await expect(realApi.getAttributes(2)).resolves.toEqual([
      expect.objectContaining({ id: 1, options: [] }),
    ]);
  });

  it('normalizes backend validation arrays and exposes error details', async () => {
    const details = { message: ['email must be valid', 'password is too short'] };
    fetchMock.mockResolvedValue(
      mockResponse({
        body: JSON.stringify(details),
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      }),
    );

    await expect(api.post('/auth/signup', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'email must be valid, password is too short',
      details,
    } satisfies Partial<ApiError>);
  });

  it('announces unauthorized responses to the session provider', async () => {
    const unauthorizedHandler = jest.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorizedHandler);
    fetchMock.mockResolvedValue(
      mockResponse({
        body: JSON.stringify({ message: 'Unauthorized' }),
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }),
    );

    await expect(api.get('/users')).rejects.toBeInstanceOf(ApiError);
    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, unauthorizedHandler);
  });
});
