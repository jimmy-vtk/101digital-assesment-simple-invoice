import bcrypt from 'bcryptjs';
import request from 'supertest';
import { User } from '../src/users/user.entity';
import { startTestApp, TestApp } from './helpers/test-app';

/**
 * API behaviour tests: real NestJS app, real PostgreSQL (Testcontainers),
 * real migrations, with data created by the tests themselves. Requires Docker.
 */
describe('SimpleInvoice API (e2e)', () => {
  let testApp: TestApp;
  let token: string;

  const credentials = { email: 'e2e@simpleinvoice.dev', password: 'E2e-Password!' };

  const invoicePayload = (overrides: Record<string, unknown> = {}) => ({
    invoiceNumber: 'E2E-0001',
    invoiceDate: '2026-06-03',
    dueDate: '2099-12-31',
    currency: 'AUD',
    description: 'E2E test invoice',
    customer: { fullname: 'Zebedee Quux', email: 'zebedee@example.com' },
    items: [{ name: 'Honda RC150', quantity: 2, rate: 1000 }],
    taxRate: 10,
    discount: 20,
    ...overrides,
  });

  const api = () => request(testApp.app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    testApp = await startTestApp();
    await testApp.dataSource.getRepository(User).save({
      email: credentials.email,
      passwordHash: await bcrypt.hash(credentials.password, 4),
      fullname: 'E2E User',
    });
  });

  afterAll(async () => {
    await testApp?.close();
  });

  describe('authentication', () => {
    it('rejects invalid credentials', async () => {
      const res = await api()
        .post('/auth/login')
        .send({ ...credentials, password: 'wrong' })
        .expect(401);
      expect(res.body).toEqual({
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    });

    it('validates the login payload', async () => {
      const res = await api().post('/auth/login').send({ email: 'not-an-email' }).expect(400);
      expect(res.body.message).toContain('email must be an email');
    });

    it('issues a JWT for valid credentials (email is case-insensitive)', async () => {
      const res = await api()
        .post('/auth/login')
        .send({ ...credentials, email: credentials.email.toUpperCase() })
        .expect(200);
      expect(res.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 3600 });
      token = res.body.accessToken;
    });

    it('returns the current user profile', async () => {
      const res = await api().get('/auth/me').set(auth()).expect(200);
      expect(res.body).toMatchObject({ email: credentials.email, fullname: 'E2E User' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it.each(['/invoices', '/auth/me'])('guards %s', async (path) => {
      await api().get(path).expect(401);
      await api().get(path).set({ Authorization: 'Bearer not-a-jwt' }).expect(401);
    });
  });

  describe('create invoice → appears in list → detail', () => {
    let invoiceId: string;

    it('creates a Draft invoice with server-calculated totals', async () => {
      const res = await api().post('/invoices').set(auth()).send(invoicePayload()).expect(201);

      invoiceId = res.body.invoiceId;
      expect(res.body).toMatchObject({
        invoiceNumber: 'E2E-0001',
        status: 'Draft',
        currencySymbol: 'AU$',
        invoiceSubTotal: 2000,
        totalTax: 200,
        totalDiscount: 20,
        totalAmount: 2180,
        totalPaid: 0,
        balanceAmount: 2180,
      });
      expect(res.body.items).toHaveLength(1);
    });

    it('finds it in the list by partial, case-insensitive customer name', async () => {
      const res = await api().get('/invoices').query({ keyword: 'zEbEd' }).set(auth()).expect(200);
      expect(res.body.paging).toEqual({ page: 1, pageSize: 10, total: 1 });
      expect(res.body.data[0]).toMatchObject({ invoiceId, invoiceNumber: 'E2E-0001' });
    });

    it('finds it by partial invoice number', async () => {
      const res = await api().get('/invoices').query({ keyword: 'e2e-00' }).set(auth()).expect(200);
      expect(res.body.data.map((i: { invoiceId: string }) => i.invoiceId)).toContain(invoiceId);
    });

    it('returns the full detail', async () => {
      const res = await api().get(`/invoices/${invoiceId}`).set(auth()).expect(200);
      expect(res.body).toMatchObject({
        invoiceId,
        description: 'E2E test invoice',
        customer: { fullname: 'Zebedee Quux', email: 'zebedee@example.com' },
        items: [{ name: 'Honda RC150', quantity: 2, rate: 1000, amount: 2000 }],
      });
    });

    it('rejects client-supplied status or totals', async () => {
      const res = await api()
        .post('/invoices')
        .set(auth())
        .send(invoicePayload({ invoiceNumber: 'E2E-HACK', status: 'Paid', totalAmount: 1 }))
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'property status should not exist',
          'property totalAmount should not exist',
        ]),
      );
    });
  });

  describe('business rules', () => {
    it('enforces unique invoice numbers with 409', async () => {
      await api()
        .post('/invoices')
        .set(auth())
        .send(invoicePayload({ invoiceNumber: 'E2E-DUP' }))
        .expect(201);
      const res = await api()
        .post('/invoices')
        .set(auth())
        .send(invoicePayload({ invoiceNumber: 'E2E-DUP' }))
        .expect(409);
      expect(res.body).toEqual({
        statusCode: 409,
        message: 'Invoice number "E2E-DUP" already exists',
        error: 'Conflict',
      });
    });

    it('handles concurrent duplicates: exactly one succeeds', async () => {
      const send = () =>
        api()
          .post('/invoices')
          .set(auth())
          .send(invoicePayload({ invoiceNumber: 'E2E-RACE' }));
      const statuses = (await Promise.all([send(), send(), send()])).map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409, 409]);
    });

    it('rejects a due date before the invoice date', async () => {
      const res = await api()
        .post('/invoices')
        .set(auth())
        .send(invoicePayload({ invoiceNumber: 'E2E-DATE', dueDate: '2026-06-02' }))
        .expect(400);
      expect(res.body).toEqual({
        statusCode: 400,
        message: ['dueDate must be on or after invoiceDate'],
        error: 'Bad Request',
      });
    });

    it('derives Overdue at read time and filters on it in SQL', async () => {
      const created = await api()
        .post('/invoices')
        .set(auth())
        .send(
          invoicePayload({
            invoiceNumber: 'E2E-LATE',
            invoiceDate: '2020-01-01',
            dueDate: '2020-01-31',
          }),
        )
        .expect(201);
      expect(created.body.status).toBe('Overdue');

      // Stored as Draft, but must not show under the Draft filter.
      const numbers = async (status: string) =>
        (
          await api().get('/invoices').query({ status, pageSize: 100 }).set(auth()).expect(200)
        ).body.data.map((i: { invoiceNumber: string }) => i.invoiceNumber);
      expect(await numbers('Overdue')).toContain('E2E-LATE');
      expect(await numbers('Draft')).not.toContain('E2E-LATE');
      expect(await numbers('Draft')).toContain('E2E-0001');
    });

    it('returns 404 for an unknown invoice and 400 for a malformed id', async () => {
      const res = await api()
        .get('/invoices/00000000-0000-4000-8000-000000000000')
        .set(auth())
        .expect(404);
      expect(res.body).toEqual({
        statusCode: 404,
        message: 'Invoice not found',
        error: 'Not Found',
      });
      await api().get('/invoices/not-a-uuid').set(auth()).expect(400);
    });
  });

  describe('list management', () => {
    it('paginates on the server', async () => {
      const page1 = await api()
        .get('/invoices')
        .query({ pageSize: 2, page: 1 })
        .set(auth())
        .expect(200);
      const page2 = await api()
        .get('/invoices')
        .query({ pageSize: 2, page: 2 })
        .set(auth())
        .expect(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.paging.total).toBeGreaterThanOrEqual(4);
      const ids1 = page1.body.data.map((i: { invoiceId: string }) => i.invoiceId);
      const ids2 = page2.body.data.map((i: { invoiceId: string }) => i.invoiceId);
      expect(ids1.filter((id: string) => ids2.includes(id))).toEqual([]);
    });

    it('sorts by totalAmount in both directions', async () => {
      await api()
        .post('/invoices')
        .set(auth())
        .send(
          invoicePayload({
            invoiceNumber: 'E2E-SMALL',
            items: [{ name: 'Pen', quantity: 1, rate: 1 }],
            discount: 0,
          }),
        )
        .expect(201);
      const amounts = async (ordering: string) =>
        (
          await api()
            .get('/invoices')
            .query({ sortBy: 'totalAmount', ordering, pageSize: 100 })
            .set(auth())
        ).body.data.map((i: { totalAmount: number }) => i.totalAmount);

      const asc = await amounts('ASC');
      expect(asc).toEqual([...asc].sort((a, b) => a - b));
      expect(asc[0]).toBe(1.1);
      expect(await amounts('DESC')).toEqual([...asc].reverse());
    });

    it('filters by invoice date range', async () => {
      const res = await api()
        .get('/invoices')
        .query({ fromDate: '2020-01-01', toDate: '2020-12-31' })
        .set(auth())
        .expect(200);
      expect(res.body.data.map((i: { invoiceNumber: string }) => i.invoiceNumber)).toEqual([
        'E2E-LATE',
      ]);
    });

    it('treats LIKE wildcards in the keyword literally', async () => {
      const res = await api().get('/invoices').query({ keyword: '%' }).set(auth()).expect(200);
      expect(res.body.paging.total).toBe(0);
    });

    it('rejects invalid query parameters', async () => {
      const res = await api()
        .get('/invoices')
        .query({ sortBy: 'customerName', pageSize: 1000 })
        .set(auth())
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          'sortBy must be one of the following values: invoiceDate, dueDate, totalAmount',
          'pageSize must not be greater than 100',
        ]),
      );
    });
  });
});
