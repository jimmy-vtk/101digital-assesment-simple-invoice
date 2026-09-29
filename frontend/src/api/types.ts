// Mirrors the backend's response/request DTOs (see backend/src/**/dto).

export const INVOICE_STATUSES = ['Draft', 'Pending', 'Paid', 'Overdue'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const SORT_FIELDS = ['invoiceDate', 'dueDate', 'totalAmount'] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type Ordering = 'ASC' | 'DESC';

export interface Customer {
  fullname: string;
  email: string;
  mobileNumber: string | null;
  address: string | null;
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceSummary {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference: string | null;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  currencySymbol: string;
  customer: Customer;
  totalAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
}

export interface InvoiceDetail extends InvoiceSummary {
  description: string | null;
  items: InvoiceItem[];
  taxRate: number;
  invoiceSubTotal: number;
  totalTax: number;
  totalDiscount: number;
  totalPaid: number;
  createdAt: string;
  createdBy: string;
}

export interface Paging {
  page: number;
  pageSize: number;
  total: number;
}

export interface InvoiceList {
  data: InvoiceSummary[];
  paging: Paging;
}

export interface InvoiceQuery {
  page: number;
  pageSize: number;
  sortBy: SortField;
  ordering: Ordering;
  status?: InvoiceStatus;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateInvoiceRequest {
  invoiceNumber: string;
  invoiceReference?: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  description?: string;
  customer: {
    fullname: string;
    email: string;
    mobileNumber?: string;
    address?: string;
  };
  items: { name: string; quantity: number; rate: number }[];
  taxRate: number;
  discount: number;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullname: string;
  createdAt: string;
}

/** Error body returned by the backend's global exception filter. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}
