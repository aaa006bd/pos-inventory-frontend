const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/backend-api';

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ResponseFormat = 'json' | 'text' | 'blob';
type QueryValue = string | number | boolean | null | undefined;

function getAuthorizationHeader(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const token = localStorage.getItem('token');
  if (!token) return undefined;

  return /^(Bearer|Token)\s/i.test(token) ? token : `Bearer ${token}`;
}

function buildUrl(endpoint: string, params?: Record<string, QueryValue>): string {
  if (!params) return endpoint;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) query.set(key, String(value));
  });

  const queryString = query.toString();
  if (!queryString) return endpoint;
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${queryString}`;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (!payload || typeof payload !== 'object') return fallback;

  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string' && message.trim()) return message;

  const error = (payload as { error?: unknown }).error;
  return typeof error === 'string' && error.trim() ? error : fallback;
}

async function parseErrorResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  responseFormat: ResponseFormat = 'json',
): Promise<T> {
  const headers = new Headers(options.headers);
  const authHeader = getAuthorizationHeader();
  if (authHeader) headers.set('Authorization', authHeader);
  if (!headers.has('Accept')) {
    headers.set('Accept', responseFormat === 'json' ? 'application/json' : '*/*');
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const details = await parseErrorResponse(response);
    const fallback = response.statusText || `Request failed (${response.status})`;

    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    throw new ApiError(response.status, getErrorMessage(details, fallback), details);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  if (responseFormat === 'text') return response.text() as Promise<T>;
  if (responseFormat === 'blob') return response.blob() as Promise<T>;

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      response.status,
      'The server returned an invalid JSON response.',
      text,
    );
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, QueryValue>) =>
    request<T>(buildUrl(endpoint, params)),
  getText: (endpoint: string, params?: Record<string, QueryValue>) =>
    request<string>(buildUrl(endpoint, params), {}, 'text'),
  getBlob: (endpoint: string, params?: Record<string, QueryValue>) =>
    request<Blob>(buildUrl(endpoint, params), {}, 'blob'),
  post: <T>(endpoint: string, data: unknown) => 
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) => 
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: unknown) => 
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => 
    request<T>(endpoint, { method: 'DELETE' }),
};

type AttributeResponse = Omit<Attribute, 'options'> & { options?: unknown };

function normalizeAttribute(attribute: AttributeResponse): Attribute {
  return {
    ...attribute,
    options: Array.isArray(attribute.options)
      ? attribute.options.filter((option): option is string => typeof option === 'string')
      : [],
  };
}

// Real API client methods matching mock API interface
export const realApi = {
  // Auth methods
  signup: (data: { email: string; password: string; role: string }) =>
    api.post<AuthResponse>('/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  requestSignupOtp: (data: {
    organization: { name: string; description: string; email: string; phone: string; address: string; taxId: string };
    admin: { email: string; mobile: string; password: string };
  }) => api.post<{ message: string }>('/tenants/signup/request-otp', data),

  verifySignupOtp: (data: { email: string; otp: string }) =>
    api.post<{ message: string }>('/tenants/signup/verify-otp', data),

  setupPassword: (data: { email: string; otp: string; password: string }) =>
    api.post<AuthResponse & { access_token?: string; data?: { token?: string } }>('/auth/setup-password/confirm', data),

  requestPasswordResetOtp: (data: { email: string }) =>
    api.post<{ message: string }>('/auth/password-reset/request-otp', data),

  confirmPasswordReset: (data: { email: string; otp: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/password-reset/confirm', data),

  // Category methods
  getCategories: () =>
    api.get<Category[]>('/products/categories'),
  
  getCategory: (id: number) =>
    api.get<Category>(`/products/categories/${id}`),
  
  createCategory: (data: { name: string; description?: string; parentId?: number }) =>
    api.post<Category>('/products/categories', data),
  
  updateCategory: (id: number, data: Partial<{ name: string; description: string; parentId: number }>) =>
    api.put<Category>(`/products/categories/${id}`, data),
  
  deleteCategory: (id: number) =>
    api.delete(`/products/categories/${id}`),
  
  getCategoryChildren: (id: number) =>
    api.get<Category[]>(`/products/categories/${id}/children`),
  
  getCategoryPath: (id: number) =>
    api.get<Category[]>(`/products/categories/${id}/path`),

  // Attribute methods
  getAttributes: async (categoryId: number) => {
    const attributes = await api.get<AttributeResponse[] | null>(
      `/products/categories/${categoryId}/attributes`,
    );
    return Array.isArray(attributes) ? attributes.map(normalizeAttribute) : [];
  },
  
  getAttribute: async (categoryId: number, id: number) =>
    normalizeAttribute(await api.get<AttributeResponse>(`/products/categories/${categoryId}/attributes/${id}`)),
  
  createAttribute: async (categoryId: number, data: { name: string; type: string; options?: string[]; required: boolean; unit?: string }) =>
    normalizeAttribute(await api.post<AttributeResponse>(`/products/categories/${categoryId}/attributes`, data)),
  
  updateAttribute: async (categoryId: number, id: number, data: Partial<{ name: string; type: string; options: string[]; required: boolean; unit: string }>) =>
    normalizeAttribute(await api.put<AttributeResponse>(`/products/categories/${categoryId}/attributes/${id}`, data)),
  
  deleteAttribute: (categoryId: number, id: number) =>
    api.delete(`/products/categories/${categoryId}/attributes/${id}`),

  // Product methods
  getProducts: (params?: { limit?: number; page?: number }) => {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
    return api.get<PaginatedResponse<Product>>(`/products${query}`);
  },
  
  getProduct: (id: number) =>
    api.get<Product>(`/products/${id}`),
  
  createProduct: (data: { name: string; description?: string; basePrice: number; categoryId: number; supplierId: number; attributes: Record<string, string>[] }) =>
    api.post<Product>('/products', data),
  
  updateProduct: (id: number, data: Partial<{ name: string; description: string; basePrice: number; categoryId: number; attributes: Record<string, string>; active: boolean }>) =>
    api.put<Product>(`/products/${id}`, data),
  
  deleteProduct: (id: number) =>
    api.delete(`/products/${id}`),
  
  // Supplier methods
  getSuppliers: () =>
    api.get<Supplier[]>('/suppliers'),
  
  createSupplier: (data: { name: string; phone: string; description?: string; contactEmail: string }) =>
    api.post<Supplier>('/suppliers', data),
  
  updateSupplier: (id: number, data: { name?: string; phone?: string; description?: string | null; contactEmail?: string }) =>
    api.put<Supplier>(`/suppliers/${id}`, data),
  
  deleteSupplier: (id: number) =>
    api.delete(`/suppliers/${id}`),

  // Customer methods
  getCustomers: () =>
    api.get<Customer[]>('/customers'),

  createCustomer: (data: { name: string; phone: string; email: string; address: string }) =>
    api.post<Customer>('/customers', data),

  // Inventory methods
  getInventory: (params?: { page?: number; limit?: number; lotNumber?: string }) => {
    const q: Record<string, string> = {};
    if (params?.page != null) q.page = String(params.page);
    if (params?.limit != null) q.limit = String(params.limit);
    if (params?.lotNumber) q.lotNumber = params.lotNumber;
    return api.get<InventoryPaginatedResponse>('/inventory/items', Object.keys(q).length ? q : undefined);
  },
  
  receiveBatchInventory: (data: { productId: number; quantity: number; supplierId: number; unitCost: number; notes?: string }) =>
    api.post<InventoryItem[]>('/inventory/receive-batch', data),
  
  scanBarcode: (barcode: string) =>
    api.get<InventoryItemWithProduct>('/inventory/scan', { barcode }),
  
  sellItem: (data: { barcode: string; notes?: string }) =>
    api.patch<InventoryItem>('/inventory/sell', data),
  
  sellBatchItems: (data: { items: { barcode: string; discountAmount?: number; notes?: string }[]; paymentMethod: string; customerId: number }) =>
    api.patch<InventoryItem[]>('/inventory/sell', data),
  
  adjustItem: (data: { barcode: string; status: 'damaged' | 'returned'; notes?: string }) =>
    api.patch<InventoryItem>('/inventory/adjust', data),

  createReturn: (data: {
    type: 'supplier_return';
    lotNumber?: string;
    items?: { barcode: string; notes?: string }[];
    notes?: string;
  }) => api.post<unknown>('/inventory/returns', data),
  
  getDailyStock: (date: string, productId: number) =>
    api.get<DailyStockResponse>('/inventory/daily-stock', { date, productId: productId.toString() }),
  
  getBarcodeImage: async (barcode: string): Promise<BarcodeImageResponse> => {
    const svg = await api.getText(`/inventory/barcode/${barcode}/image`);
    return { svg };
  },
  
  getBarcodeImages: (barcodes: string[]) =>
    api.get<BarcodeImagesResponse>('/inventory/barcode-images', { barcodes: barcodes.join(',') }),

  getLots: (params?: { page?: number; limit?: number }) => {
    const q: Record<string, string> = {};
    if (params?.page != null) q.page = String(params.page);
    if (params?.limit != null) q.limit = String(params.limit);
    return api.get<LotsResponse>('/inventory/lots', Object.keys(q).length ? q : undefined);
  },

  // Accounting methods
  createSupplierPayment: (data: { supplierId: number; amount: number; description?: string }) =>
    api.post<SupplierPayment>('/accounting/supplier-payments', data),

  getSupplierLedger: (supplierId: number) =>
    api.get<LedgerEntry[]>(`/accounting/ledger/suppliers/${supplierId}`),

  getAllSupplierLedgers: () =>
    api.get<SupplierLedgerSummary[]>('/accounting/ledger/suppliers/'),

  // Expense methods
  getExpenses: () =>
    api.get<Expense[]>('/accounting/expenses'),

  getExpenseSummary: (params: { from: string; to: string }) =>
    api.get<ExpenseSummary>('/accounting/expenses/summary', params as Record<string, string>),

  createExpense: (data: { amount: number; description?: string; accountId?: number }) =>
    api.post<Expense>('/accounting/expenses', data),

  // Sales history methods
  getSales: (params?: { page?: number; limit?: number }) => {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
    return api.get<SalesListResponse>(`/sales${query}`);
  },

  getSale: (id: number) =>
    api.get<SaleRecord>(`/sales/${id}`),

  getSalesByCustomer: (customerId: number, params?: { page?: number; limit?: number }) => {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
    return api.get<SalesListResponse>(`/sales/customers/${customerId}${query}`);
  },
};

export interface User {
  id: number;
  email: string;
  role: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  parent?: Category;
  attributes: Attribute[];
  products: Product[];
  active: boolean;
}

export interface Attribute {
  id: number;
  name: string;
  type: string;
  unit: string | null;
  options: string[];
  required: boolean;
  categoryId: number;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  basePrice: number;
  sku?: string | null;
  attributes: Record<string, string>[];
  categoryId: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResponse<T> {
  data: T[];
  total: number;
}

export interface InventoryItem {
  id: number;
  tenantId: number;
  productId: number;
  supplierId: number | null;
  barcode: string;
  lotId: number | null;
  lotNumber: string | null;
  status: 'in_stock' | 'sold' | 'damaged' | 'returned';
  acquiredDate: string;
  soldDate: string | null;
  adjustedDate: string | null;
  notes: string | null;
  adjustmentReason: string | null;
  discountAmount: string;
  acquisitionCost: string | null;
  salePrice: string | null;
  updatedAt: string;
}

export interface InventoryPaginatedResponse {
  page: string;
  limit: string;
  total: number;
  pageCount: number;
  hasNext: boolean;
  items: InventoryItemWithProduct[];
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  contactEmail: string;
  description?: string | null;
  createdAt?: string;
}

export interface InventoryItemWithProduct extends InventoryItem {
  product: Product;
  supplier?: Supplier | null;
}

export interface DailyStockResponse {
  opening: number;
  closing: number;
}

export interface BarcodeImageResponse {
  svg: string;
}

export interface BarcodeImagesResponse {
  images: string[];
}

export interface SupplierPayment {
  id: number;
  supplierId: number;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface SupplierLedgerSummary {
  supplierId: number;
  supplierName: string;
  balance: number;
  totalCredit: number;
  totalDebit: number;
}

export interface SaleLine {
  id: number;
  tenantId: number;
  salesRecordId: number;
  inventoryItemId: number;
  productId: number;
  product: Product;
  barcode: string;
  salePrice: string;
  discountAmount: string;
  netAmount: string;
  acquisitionCost: string;
}

export interface JournalEntry {
  id: number;
  tenantId?: number;
  date: string;
  reference: string;
  description: string;
  eventType: string;
  createdAt: string;
}

export interface SaleRecord {
  id: number;
  tenantId: number;
  saleNumber: string;
  customerId: number | null;
  customer: Customer | null;
  paymentMethod: string;
  grossAmount: string;
  discountAmount: string;
  netAmount: string;
  totalCost: string;
  status: string;
  soldAt: string;
  journalEntryId: number | null;
  journalEntry?: JournalEntry | null;
  lines: SaleLine[];
  createdAt: string;
  updatedAt: string;
}

export interface SalesListResponse {
  items: SaleRecord[];
  page: number;
  limit: number;
  total: number;
  pageCount: number;
  hasNext: boolean;
}

export interface Expense {
  id: number;
  date: string;
  reference: string;
  amount: number;
  description: string | null;
  accountId: number | null;
}

export interface ExpenseSummary {
  totalAmount: number;
  count: number;
}

export interface LotBarcodeItem {
  id: number;
  status: string;
  barcode: string;
}

export interface Lot {
  id: number;
  lotNumber: string;
  productId: number;
  productName: string;
  sku: string;
  supplierId: number;
  supplierName: string;
  quantityReceived: number;
  totalCost: number;
  unitCost: number;
  notes: string | null;
  journalEntryId: number;
  receivedAt: string;
  updatedAt: string;
  itemCount: number;
  items: LotBarcodeItem[];
}

export interface LotsResponse {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
  hasNext: boolean;
  items: Lot[];
}
