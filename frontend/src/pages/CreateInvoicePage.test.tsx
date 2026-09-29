import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { CreateInvoiceRequest } from '../api/types';
import { renderApp } from '../test/render';
import { API, backend, server } from '../test/server';
import { addDays, todayLocal } from '../utils/format';

type User = ReturnType<typeof renderApp>['user'];

async function fillValidForm(user: User, invoiceNumber = 'NEW-001') {
  await user.type(screen.getByLabelText(/customer name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/customer email/i), 'jane@example.com');
  await user.type(screen.getByLabelText(/invoice number/i), invoiceNumber);
  await user.type(screen.getByLabelText(/item name/i), 'Consulting');
  await user.clear(screen.getByLabelText(/quantity/i));
  await user.type(screen.getByLabelText(/quantity/i), '3');
  await user.type(screen.getByLabelText(/^rate/i), '99.99');
  await user.clear(screen.getByLabelText(/discount/i));
  await user.type(screen.getByLabelText(/discount/i), '5');
}

const submit = (user: User) => user.click(screen.getByRole('button', { name: /create invoice/i }));

describe('CreateInvoicePage', () => {
  it('pre-fills sensible defaults (today, +30 days, AUD, 10% tax, no discount)', async () => {
    renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });
    expect(screen.getByLabelText(/invoice date/i)).toHaveValue(todayLocal());
    expect(screen.getByLabelText(/due date/i)).toHaveValue(addDays(todayLocal(), 30));
    expect(screen.getByRole('combobox', { name: /currency/i })).toHaveTextContent('AUD');
    expect(screen.getByLabelText(/^tax/i)).toHaveValue('10');
    expect(screen.getByLabelText(/discount/i)).toHaveValue('0');
  });

  it('validates required fields and rules before submitting', async () => {
    const { user } = renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });

    await user.clear(screen.getByLabelText(/due date/i));
    await user.type(screen.getByLabelText(/due date/i), '2000-01-01');
    await user.clear(screen.getByLabelText(/quantity/i));
    await user.type(screen.getByLabelText(/quantity/i), '1.5');
    await user.type(screen.getByLabelText(/customer email/i), 'nope');
    await submit(user);

    for (const message of [
      'Customer name is required',
      'Enter a valid email address',
      'Invoice number is required',
      'Due date must be on or after the invoice date',
      'Item name is required',
      'Quantity must be a positive whole number',
      'Rate is required',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument();
    }
    expect(backend.invoices).toHaveLength(12);
  });

  it('creates the invoice, notifies the user and returns to the list', async () => {
    let sent: CreateInvoiceRequest | undefined;
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'POST' && request.url.endsWith('/api/invoices'))
        sent = await request.clone().json();
    });

    const { user, location } = renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });
    await fillValidForm(user);
    await submit(user);

    expect(await screen.findByText('Invoice NEW-001 created')).toBeInTheDocument();
    await waitFor(() => expect(location()).toBe('/'));
    expect(await screen.findByRole('link', { name: 'NEW-001' })).toBeInTheDocument();

    // Only raw inputs are sent; totals are left to the server.
    expect(sent).toMatchObject({
      invoiceNumber: 'NEW-001',
      currency: 'AUD',
      customer: { fullname: 'Jane Doe', email: 'jane@example.com' },
      items: [{ name: 'Consulting', quantity: 3, rate: 99.99 }],
      taxRate: 10,
      discount: 5,
    });
    expect(sent).not.toHaveProperty('totalAmount');
    expect(sent?.customer).not.toHaveProperty('mobileNumber');
    server.events.removeAllListeners();
  });

  it('shows a duplicate invoice number on the field (409)', async () => {
    const { user, location } = renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });
    await fillValidForm(user, 'IV1780488206995');
    await submit(user);

    expect(await screen.findByText('This invoice number is already in use')).toBeInTheDocument();
    expect(screen.getByLabelText(/invoice number/i)).toHaveFocus();
    expect(location()).toBe('/invoices/new');
  });

  it('maps server validation messages onto the matching fields', async () => {
    server.use(
      http.post(`${API}/invoices`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: [
              'discount must not exceed the invoice subtotal plus tax',
              'something unexpected',
            ],
            error: 'Bad Request',
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });
    await fillValidForm(user);
    await submit(user);

    expect(
      await screen.findByText('discount must not exceed the invoice subtotal plus tax'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('something unexpected');
  });
});
