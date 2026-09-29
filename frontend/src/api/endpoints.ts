import { apiClient } from './client';
import type {
  CreateInvoiceRequest,
  InvoiceDetail,
  InvoiceList,
  InvoiceQuery,
  LoginResponse,
  UserProfile,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),

  me: () => apiClient.get<UserProfile>('/auth/me').then((r) => r.data),
};

export const invoicesApi = {
  list: (query: InvoiceQuery) => {
    // Drop empty optional filters so URLs stay clean.
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    );
    return apiClient.get<InvoiceList>('/invoices', { params }).then((r) => r.data);
  },

  get: (id: string) => apiClient.get<InvoiceDetail>(`/invoices/${id}`).then((r) => r.data),

  create: (payload: CreateInvoiceRequest) =>
    apiClient.post<InvoiceDetail>('/invoices', payload).then((r) => r.data),
};

export const queryKeys = {
  me: ['auth', 'me'] as const,
  invoices: ['invoices'] as const,
  invoiceList: (query: InvoiceQuery) => ['invoices', 'list', query] as const,
  invoice: (id: string) => ['invoices', 'detail', id] as const,
};
