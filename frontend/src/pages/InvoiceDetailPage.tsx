import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import { ApiError } from '../api/client';
import { invoicesApi, queryKeys } from '../api/endpoints';
import type { InvoiceDetail } from '../api/types';
import { StatusChip } from '../components/StatusChip';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';

/** Columns shown from the `sm` breakpoint up. */
const wideOnly = { display: { xs: 'none', sm: 'table-cell' } } as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        {children || '—'}
      </Typography>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" component="section" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function BackButton() {
  return (
    <Button
      component={RouterLink}
      to="/"
      startIcon={<ArrowBackIcon />}
      sx={{ alignSelf: 'flex-start' }}
    >
      Back to invoices
    </Button>
  );
}

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const {
    data: invoice,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => invoicesApi.get(id),
  });

  if (isPending) {
    return (
      <Stack spacing={2} aria-busy="true" aria-label="Loading invoice">
        <Skeleton variant="text" width={240} height={48} />
        <Skeleton variant="rounded" height={180} />
        <Skeleton variant="rounded" height={180} />
      </Stack>
    );
  }

  if (isError) {
    // 400 = malformed id in the URL; treat it like a missing invoice.
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <Stack spacing={2}>
        <BackButton />
        <Alert
          severity={notFound ? 'warning' : 'error'}
          action={
            notFound ? undefined : (
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Retry
              </Button>
            )
          }
        >
          {notFound
            ? 'Invoice not found. It may have been removed or the link is incorrect.'
            : error.message}
        </Alert>
      </Stack>
    );
  }

  return <InvoiceDetailView invoice={invoice} />;
}

function InvoiceDetailView({ invoice }: { invoice: InvoiceDetail }) {
  const money = (amount: number) => formatMoney(amount, invoice.currencySymbol);

  return (
    <Stack spacing={3}>
      <BackButton />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="h1" sx={{ overflowWrap: 'anywhere' }}>
            Invoice {invoice.invoiceNumber}
          </Typography>
          <StatusChip status={invoice.status} size="medium" />
        </Stack>
        <Typography variant="h2" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {money(invoice.totalAmount)}
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Section title="Invoice information">
            <Grid container spacing={2} component="dl" sx={{ m: 0 }}>
              <Grid size={6}>
                <Field label="Invoice number">{invoice.invoiceNumber}</Field>
              </Grid>
              <Grid size={6}>
                <Field label="Reference">{invoice.invoiceReference}</Field>
              </Grid>
              <Grid size={6}>
                <Field label="Invoice date">{formatDate(invoice.invoiceDate)}</Field>
              </Grid>
              <Grid size={6}>
                <Field label="Due date">{formatDate(invoice.dueDate)}</Field>
              </Grid>
              <Grid size={6}>
                <Field label="Currency">
                  {invoice.currency} ({invoice.currencySymbol})
                </Field>
              </Grid>
              <Grid size={6}>
                <Field label="Created">{formatDateTime(invoice.createdAt)}</Field>
              </Grid>
              <Grid size={12}>
                <Field label="Description">{invoice.description}</Field>
              </Grid>
            </Grid>
          </Section>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Section title="Customer">
            <Grid container spacing={2} component="dl" sx={{ m: 0 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Field label="Name">{invoice.customer.fullname}</Field>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Field label="Email">{invoice.customer.email}</Field>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Field label="Mobile">{invoice.customer.mobileNumber}</Field>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Field label="Address">{invoice.customer.address}</Field>
              </Grid>
            </Grid>
          </Section>
        </Grid>
      </Grid>

      <Section title="Line items">
        <TableContainer>
          <Table size="small" aria-label="Line items">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell align="right" sx={wideOnly}>
                  Quantity
                </TableCell>
                <TableCell align="right" sx={wideOnly}>
                  Rate
                </TableCell>
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.name}
                    {/* On phones, quantity × rate sits under the name instead of in columns. */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: { xs: 'block', sm: 'none' } }}
                    >
                      {item.quantity} × {money(item.rate)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={wideOnly}>
                    {item.quantity}
                  </TableCell>
                  <TableCell align="right" sx={wideOnly}>
                    {money(item.rate)}
                  </TableCell>
                  <TableCell align="right">{money(item.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack
          component="dl"
          aria-label="Invoice totals"
          spacing={1}
          sx={{ mt: 3, ml: 'auto', mb: 0, maxWidth: 360, fontVariantNumeric: 'tabular-nums' }}
        >
          <TotalRow label="Subtotal" value={money(invoice.invoiceSubTotal)} />
          <TotalRow label={`Tax (${invoice.taxRate}%)`} value={money(invoice.totalTax)} />
          <TotalRow label="Discount" value={`−${money(invoice.totalDiscount)}`} />
          <Divider />
          <TotalRow label="Total" value={money(invoice.totalAmount)} strong />
          <TotalRow label="Amount paid" value={money(invoice.totalPaid)} />
          <Divider />
          <TotalRow label="Balance outstanding" value={money(invoice.balanceAmount)} strong />
        </Stack>
      </Section>
    </Stack>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const weight = strong ? 700 : 400;
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography component="dt" sx={{ fontWeight: weight }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, fontWeight: weight }}>
        {value}
      </Typography>
    </Stack>
  );
}
