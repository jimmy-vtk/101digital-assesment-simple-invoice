import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ApiErrorBody, CreateInvoiceRequest, InvoiceDetail } from '../api/types';
import { buildInvoices, TEST_PASSWORD, TEST_USER, toSummary } from './fixtures';

export const API = '*/api';

const error = (statusCode: number, message: string | string[], errorName: string) =>
  HttpResponse.json<ApiErrorBody>(
    { statusCode, message, error: errorName },
    { status: statusCode },
  );

/**
 * In-memory fake of the backend, faithful enough for UI tests: auth check,
 * keyword/status filtering, sorting, paging, 404s and duplicate numbers.
 */
export function createFakeBackend() {
  let invoices: InvoiceDetail[] = buildInvoices();
  const requests: URL[] = [];

  const authorized = (request: Request) =>
    request.headers.get('authorization') === 'Bearer test-token';

  const handlers = [
    http.post(`${API}/auth/login`, async ({ request }) => {
      const body = (await request.json()) as { email: string; password: string };
      if (body.email === TEST_USER.email && body.password === TEST_PASSWORD) {
        return HttpResponse.json({
          accessToken: 'test-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
        });
      }
      return error(401, 'Invalid email or password', 'Unauthorized');
    }),

    http.get(`${API}/auth/me`, ({ request }) =>
      authorized(request)
        ? HttpResponse.json(TEST_USER)
        : error(401, 'Unauthorized', 'Unauthorized'),
    ),

    http.get(`${API}/invoices`, ({ request }) => {
      if (!authorized(request)) return error(401, 'Unauthorized', 'Unauthorized');
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
      const keyword = url.searchParams.get('keyword')?.toLowerCase();
      const status = url.searchParams.get('status');
      const sortBy = (url.searchParams.get('sortBy') ?? 'invoiceDate') as
        'invoiceDate' | 'dueDate' | 'totalAmount';
      const direction = url.searchParams.get('ordering') === 'ASC' ? 1 : -1;

      const matches = invoices
        .filter(
          (i) =>
            !keyword ||
            i.invoiceNumber.toLowerCase().includes(keyword) ||
            i.customer.fullname.toLowerCase().includes(keyword),
        )
        .filter((i) => !status || i.status === status)
        .sort((a, b) => (a[sortBy] < b[sortBy] ? -1 : a[sortBy] > b[sortBy] ? 1 : 0) * direction);

      return HttpResponse.json({
        data: matches.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
        paging: { page, pageSize, total: matches.length },
      });
    }),

    http.get(`${API}/invoices/:id`, ({ request, params }) => {
      if (!authorized(request)) return error(401, 'Unauthorized', 'Unauthorized');
      const invoice = invoices.find((i) => i.invoiceId === params.id);
      return invoice ? HttpResponse.json(invoice) : error(404, 'Invoice not found', 'Not Found');
    }),

    http.post(`${API}/invoices`, async ({ request }) => {
      if (!authorized(request)) return error(401, 'Unauthorized', 'Unauthorized');
      const body = (await request.json()) as CreateInvoiceRequest;
      if (invoices.some((i) => i.invoiceNumber === body.invoiceNumber)) {
        return error(409, `Invoice number "${body.invoiceNumber}" already exists`, 'Conflict');
      }
      const item = body.items[0];
      const subTotal = item.quantity * item.rate;
      const tax = Math.round(subTotal * body.taxRate) / 100;
      const total = subTotal + tax - body.discount;
      const created: InvoiceDetail = {
        invoiceId: crypto.randomUUID(),
        invoiceNumber: body.invoiceNumber,
        invoiceReference: body.invoiceReference ?? null,
        invoiceDate: body.invoiceDate,
        dueDate: body.dueDate,
        currency: body.currency,
        currencySymbol: body.currency === 'AUD' ? 'AU$' : body.currency,
        customer: {
          fullname: body.customer.fullname,
          email: body.customer.email,
          mobileNumber: body.customer.mobileNumber ?? null,
          address: body.customer.address ?? null,
        },
        description: body.description ?? null,
        items: [{ id: crypto.randomUUID(), ...item, amount: subTotal }],
        taxRate: body.taxRate,
        invoiceSubTotal: subTotal,
        totalTax: tax,
        totalDiscount: body.discount,
        totalAmount: total,
        totalPaid: 0,
        balanceAmount: total,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        createdBy: TEST_USER.id,
      };
      invoices = [created, ...invoices];
      return HttpResponse.json(created, { status: 201 });
    }),
  ];

  return {
    handlers,
    requests,
    get invoices() {
      return invoices;
    },
    reset() {
      invoices = buildInvoices();
      requests.length = 0;
    },
  };
}

export const backend = createFakeBackend();
export const server = setupServer(...backend.handlers);
