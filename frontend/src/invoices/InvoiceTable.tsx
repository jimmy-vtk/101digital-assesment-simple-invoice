import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import { Link as RouterLink, useNavigate } from 'react-router';
import type { InvoiceQuery, InvoiceSummary, SortField } from '../api/types';
import { StatusChip } from '../components/StatusChip';
import { formatDate, formatMoney } from '../utils/format';

interface Props {
  invoices: InvoiceSummary[];
  query: InvoiceQuery;
  onSort(sortBy: SortField): void;
}

/** Desktop layout: sortable table; the whole row opens the invoice. */
export function InvoiceTable({ invoices, query, onSort }: Props) {
  const navigate = useNavigate();

  const sortableHeader = (field: SortField, label: string, align?: 'right') => (
    <TableCell
      align={align}
      sortDirection={query.sortBy === field ? (query.ordering === 'ASC' ? 'asc' : 'desc') : false}
    >
      <TableSortLabel
        active={query.sortBy === field}
        direction={query.sortBy === field && query.ordering === 'ASC' ? 'asc' : 'desc'}
        onClick={() => onSort(field)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Table size="medium" aria-label="Invoices">
      <TableHead>
        <TableRow>
          <TableCell>Invoice number</TableCell>
          <TableCell>Customer</TableCell>
          {sortableHeader('invoiceDate', 'Invoice date')}
          {sortableHeader('dueDate', 'Due date')}
          {sortableHeader('totalAmount', 'Total amount', 'right')}
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow
            key={invoice.invoiceId}
            hover
            onClick={() => navigate(`/invoices/${invoice.invoiceId}`)}
            sx={{ cursor: 'pointer' }}
          >
            <TableCell>
              {/* Real link for keyboard and screen-reader users; row click is a shortcut. */}
              <Link
                component={RouterLink}
                to={`/invoices/${invoice.invoiceId}`}
                onClick={(e) => e.stopPropagation()}
                sx={{ fontWeight: 600 }}
              >
                {invoice.invoiceNumber}
              </Link>
            </TableCell>
            <TableCell>{invoice.customer.fullname}</TableCell>
            <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
            <TableCell>{formatDate(invoice.dueDate)}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(invoice.totalAmount, invoice.currencySymbol)}
            </TableCell>
            <TableCell>
              <StatusChip status={invoice.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
