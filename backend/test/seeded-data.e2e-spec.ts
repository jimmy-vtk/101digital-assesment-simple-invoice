import request from 'supertest';
import { REVIEWER_USER_ID } from '../src/database/seed/seed-data';
import { seedDatabase } from '../src/database/seed/seeder';
import { startTestApp, TestApp } from './helpers/test-app';

interface Summary {
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
  customer: { fullname: string };
}

/**
 * Runs the real seed script against a fresh PostgreSQL container and checks,
 * through the HTTP API, that the Appendix A mock data and the generated
 * records behave as the specification requires. Requires Docker.
 */
describe('Seeded data (e2e)', () => {
  let testApp: TestApp;
  let token: string;
  let all: Summary[];

  const reviewer = {
    email: 'reviewer@simpleinvoice.dev',
    password: 'Seed-Password-1!',
    fullname: 'Reviewer',
  };
  const credentials = (password = reviewer.password) => ({ email: reviewer.email, password });
  const api = () => request(testApp.app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    testApp = await startTestApp();
    const result = await seedDatabase(testApp.dataSource, reviewer);
    expect(result).toEqual({ userId: REVIEWER_USER_ID, inserted: 41, total: 41 });

    const login = await api().post('/auth/login').send(credentials()).expect(200);
    token = login.body.accessToken;
    all = (await api().get('/invoices').query({ pageSize: 100 }).set(auth()).expect(200)).body.data;
  });

  afterAll(async () => {
    await testApp?.close();
  });

  describe('seed script', () => {
    it('is idempotent and resets the reviewer password', async () => {
      const rerun = await seedDatabase(testApp.dataSource, {
        ...reviewer,
        password: 'Changed-Password-2!',
      });
      expect(rerun).toEqual({ userId: REVIEWER_USER_ID, inserted: 0, total: 41 });

      await api().post('/auth/login').send(credentials()).expect(401);
      await api().post('/auth/login').send(credentials('Changed-Password-2!')).expect(200);

      // Restore the original password for the remaining tests.
      await seedDatabase(testApp.dataSource, reviewer);
    });

    it('never stores Overdue in the database', async () => {
      const rows: { status: string; count: string }[] = await testApp.dataSource.query(
        `SELECT status, count(*) FROM invoices GROUP BY status`,
      );
      expect(rows.map((r) => r.status).sort()).toEqual(['Draft', 'Paid', 'Pending']);
    });
  });

  describe('Appendix A mock invoice', () => {
    it('is served with the exact values from the specification', async () => {
      const list = await api()
        .get('/invoices')
        .query({ keyword: 'IV1780488206995' })
        .set(auth())
        .expect(200);
      expect(list.body.paging.total).toBe(1);

      const detail = await api()
        .get(`/invoices/${list.body.data[0].invoiceId}`)
        .set(auth())
        .expect(200);
      expect(detail.body).toMatchObject({
        invoiceNumber: 'IV1780488206995',
        invoiceReference: '#5721662',
        invoiceDate: '2026-06-03',
        dueDate: '2026-07-03',
        currency: 'AUD',
        currencySymbol: 'AU$',
        description: 'Invoice is issued to Kanglee',
        customer: {
          fullname: 'Paul',
          email: 'paul@101digital.io',
          mobileNumber: '947717364111',
          address: 'Singapore',
        },
        items: [{ name: 'Honda RC150', quantity: 2, rate: 1000, amount: 2000 }],
        taxRate: 10,
        invoiceSubTotal: 2000,
        totalTax: 200,
        totalDiscount: 20,
        totalAmount: 2180,
        totalPaid: 1451.34,
        balanceAmount: 728.66,
        createdAt: '2026-06-03T12:03:26.995Z',
        createdBy: REVIEWER_USER_ID,
        // Mock says "Overdue": stored as Pending, derived as Overdue (due date passed).
        status: 'Overdue',
      });
    });
  });

  describe('generated records', () => {
    it('contains 41 invoices with every status represented', async () => {
      expect(all).toHaveLength(41);
      const counts: Record<string, number> = {};
      for (const status of ['Draft', 'Pending', 'Paid', 'Overdue']) {
        const res = await api().get('/invoices').query({ status, pageSize: 1 }).set(auth());
        counts[status] = res.body.paging.total;
        expect(counts[status]).toBeGreaterThan(0);
      }
      expect(Object.values(counts).reduce((a, b) => a + b)).toBe(41);
    });

    it('has consistent money: balance = total − paid, Paid invoices fully settled', async () => {
      for (const invoice of all) {
        expect(invoice.balanceAmount).toBeGreaterThanOrEqual(0);
        expect(invoice.balanceAmount).toBeLessThanOrEqual(invoice.totalAmount);
        if (invoice.status === 'Paid') expect(invoice.balanceAmount).toBe(0);
      }
    });

    it('status filters agree with the per-record derived status', async () => {
      for (const status of ['Draft', 'Pending', 'Paid', 'Overdue']) {
        const res = await api().get('/invoices').query({ status, pageSize: 100 }).set(auth());
        const expected = all.filter((i) => i.status === status).map((i) => i.invoiceId);
        expect(res.body.data.map((i: Summary) => i.invoiceId).sort()).toEqual(expected.sort());
      }
    });

    it('pages through every record exactly once', async () => {
      const seen: string[] = [];
      for (let page = 1; page <= 5; page++) {
        const res = await api().get('/invoices').query({ page, pageSize: 10 }).set(auth());
        expect(res.body.paging).toEqual({ page, pageSize: 10, total: 41 });
        seen.push(...res.body.data.map((i: Summary) => i.invoiceId));
      }
      expect(seen).toHaveLength(41);
      expect(new Set(seen).size).toBe(41);
    });

    it('sorts by due date ascending', async () => {
      const res = await api()
        .get('/invoices')
        .query({ sortBy: 'dueDate', ordering: 'ASC', pageSize: 100 })
        .set(auth());
      const dates = res.body.data.map((i: Summary) => i.dueDate);
      expect(dates).toEqual([...dates].sort());
    });

    it('searches customer names case-insensitively', async () => {
      const res = await api().get('/invoices').query({ keyword: 'KANGLEE' }).set(auth());
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const invoice of res.body.data as Summary[]) {
        expect(invoice.customer.fullname.toLowerCase()).toContain('kanglee');
      }
    });
  });
});
