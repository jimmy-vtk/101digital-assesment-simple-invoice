import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MOCK_INVOICE } from '../test/fixtures';
import { renderApp } from '../test/render';

describe('InvoiceDetailPage', () => {
  it('shows every section of the Appendix A invoice', async () => {
    renderApp(`/invoices/${MOCK_INVOICE.invoiceId}`);

    expect(
      await screen.findByRole('heading', { name: 'Invoice IV1780488206995' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Overdue')[0]).toBeInTheDocument();

    // Invoice + customer information
    for (const text of [
      '#5721662',
      '3 Jun 2026',
      '3 Jul 2026',
      'AUD (AU$)',
      'Invoice is issued to Kanglee',
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const text of ['Paul', 'paul@101digital.io', '947717364111', 'Singapore']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }

    // Line items
    const items = screen.getByRole('table', { name: 'Line items' });
    const itemRow = within(items).getByText('Honda RC150').closest('tr')!;
    expect(within(itemRow).getByText('2')).toBeInTheDocument();
    expect(within(itemRow).getByText('AU$1,000.00')).toBeInTheDocument();
    expect(within(itemRow).getByText('AU$2,000.00')).toBeInTheDocument();

    // Totals, as calculated by the server
    const totals = within(screen.getByLabelText('Invoice totals'));
    const valueOf = (label: string) => totals.getByText(label).nextElementSibling?.textContent;
    expect(valueOf('Subtotal')).toBe('AU$2,000.00');
    expect(valueOf('Tax (10%)')).toBe('AU$200.00');
    expect(valueOf('Discount')).toBe('−AU$20.00');
    expect(valueOf('Total')).toBe('AU$2,180.00');
    expect(valueOf('Amount paid')).toBe('AU$1,451.34');
    expect(valueOf('Balance outstanding')).toBe('AU$728.66');
  });

  it('shows a friendly message for an unknown invoice', async () => {
    renderApp('/invoices/00000000-0000-4000-8000-999999999999');
    expect(await screen.findByText(/invoice not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to invoices/i })).toHaveAttribute('href', '/');
  });
});
