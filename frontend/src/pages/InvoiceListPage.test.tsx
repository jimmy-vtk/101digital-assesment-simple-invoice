import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';
import { API, backend, server } from '../test/server';
import { setViewport } from '../test/viewport';

const lastRequest = () => backend.requests.at(-1)!.searchParams;
const rows = () =>
  within(screen.getByRole('table', { name: 'Invoices' }))
    .getAllByRole('row')
    .slice(1);

describe('InvoiceListPage', () => {
  it('shows the first page with the key invoice fields', async () => {
    renderApp('/');
    const table = await screen.findByRole('table', { name: 'Invoices' });

    for (const header of [
      'Invoice number',
      'Customer',
      'Invoice date',
      'Due date',
      'Total amount',
      'Status',
    ]) {
      expect(
        within(table).getByRole('columnheader', { name: new RegExp(header) }),
      ).toBeInTheDocument();
    }
    expect(rows()).toHaveLength(10);
    expect(screen.getByText('1–10 of 12')).toBeInTheDocument();
    expect(lastRequest().get('page')).toBe('1');
    expect(lastRequest().get('pageSize')).toBe('10');
  });

  it('renders the mock invoice with formatted values and derived status', async () => {
    renderApp('/?keyword=IV1780488206995');
    const row = (await screen.findByRole('link', { name: 'IV1780488206995' })).closest('tr')!;
    expect(within(row).getByText('Paul')).toBeInTheDocument();
    expect(within(row).getByText('3 Jun 2026')).toBeInTheDocument();
    expect(within(row).getByText('3 Jul 2026')).toBeInTheDocument();
    expect(within(row).getByText('AU$2,180.00')).toBeInTheDocument();
    expect(within(row).getByText('Overdue')).toBeInTheDocument();
  });

  it('searches by keyword after the user stops typing', async () => {
    const { user, location } = renderApp('/');
    await screen.findByRole('table', { name: 'Invoices' });

    await user.type(screen.getByRole('textbox', { name: 'Search invoices' }), 'acme');
    await waitFor(() => expect(lastRequest().get('keyword')).toBe('acme'));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(location()).toBe('/?keyword=acme');
    // Debounced: one request for the whole word, not one per keystroke.
    expect(backend.requests.filter((r) => r.searchParams.has('keyword'))).toHaveLength(1);
  });

  it('filters by status', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('table', { name: 'Invoices' });

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(screen.getByRole('option', { name: 'Paid' }));

    await waitFor(() => expect(lastRequest().get('status')).toBe('Paid'));
    await waitFor(() =>
      rows().forEach((row) => expect(within(row).getByText('Paid')).toBeInTheDocument()),
    );
  });

  it('sorts from the column headers, toggling direction', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('table', { name: 'Invoices' });

    await user.click(screen.getByRole('button', { name: 'Total amount' }));
    await waitFor(() => expect(lastRequest().get('sortBy')).toBe('totalAmount'));
    expect(lastRequest().get('ordering')).toBe('DESC');

    await user.click(screen.getByRole('button', { name: 'Total amount' }));
    await waitFor(() => expect(lastRequest().get('ordering')).toBe('ASC'));
  });

  it('pages on the server and resets to page 1 when filters change', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('table', { name: 'Invoices' });

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => expect(lastRequest().get('page')).toBe('2'));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.getByText('11–12 of 12')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search invoices' }), 'inv');
    await waitFor(() => expect(lastRequest().get('keyword')).toBe('inv'));
    expect(lastRequest().get('page')).toBe('1');
  });

  it('changes the page size', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('table', { name: 'Invoices' });

    await user.click(screen.getByRole('combobox', { name: /rows per page/i }));
    await user.click(screen.getByRole('option', { name: '5' }));
    await waitFor(() => expect(lastRequest().get('pageSize')).toBe('5'));
    await waitFor(() => expect(rows()).toHaveLength(5));
  });

  it('restores list state from the URL', async () => {
    renderApp('/?status=Draft&sortBy=dueDate&ordering=ASC&page=1');
    await screen.findByRole('table', { name: 'Invoices' });
    expect(lastRequest().get('status')).toBe('Draft');
    expect(lastRequest().get('sortBy')).toBe('dueDate');
    expect(lastRequest().get('ordering')).toBe('ASC');
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent(
      'Due date (soonest first)',
    );
  });

  it('shows an empty state with a way to clear filters', async () => {
    const { user } = renderApp('/?keyword=zzz-no-match');
    expect(await screen.findByText('No matching invoices')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByRole('table', { name: 'Invoices' })).toBeInTheDocument();
  });

  it('shows an error with retry when the API fails', async () => {
    server.use(
      http.get(`${API}/invoices`, () =>
        HttpResponse.json(
          { statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' },
          { status: 500 },
        ),
      ),
    );
    renderApp('/');
    expect(await screen.findByText('Internal server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('opens an invoice when its row is clicked', async () => {
    const { user, location } = renderApp('/');
    await screen.findByRole('table', { name: 'Invoices' });
    await user.click(screen.getByText('INV-1011').closest('tr')!.cells[1]);
    await waitFor(() => expect(location()).toMatch(/^\/invoices\/[0-9a-f-]+$/));
  });

  it('uses a card layout on mobile', async () => {
    setViewport('mobile');
    renderApp('/');
    const list = await screen.findByRole('list', { name: 'Invoices' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    expect(within(list).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/invoices\//),
    );
  });
});
