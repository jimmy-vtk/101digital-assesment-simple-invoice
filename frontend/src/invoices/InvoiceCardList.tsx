import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';
import type { InvoiceSummary } from '../api/types';
import { StatusChip } from '../components/StatusChip';
import { formatDate, formatMoney } from '../utils/format';

/** Mobile layout: one tappable card per invoice. */
export function InvoiceCardList({ invoices }: { invoices: InvoiceSummary[] }) {
  return (
    <Stack
      component="ul"
      spacing={1.5}
      sx={{ listStyle: 'none', m: 0, p: 0 }}
      aria-label="Invoices"
    >
      {invoices.map((invoice) => (
        <li key={invoice.invoiceId}>
          <Card variant="outlined">
            <CardActionArea component={RouterLink} to={`/invoices/${invoice.invoiceId}`}>
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {invoice.invoiceNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {invoice.customer.fullname}
                    </Typography>
                  </div>
                  <StatusChip status={invoice.status} />
                </Stack>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'flex-end', mt: 1.5 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Issued {formatDate(invoice.invoiceDate)}
                    <br />
                    Due {formatDate(invoice.dueDate)}
                  </Typography>
                  <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(invoice.totalAmount, invoice.currencySymbol)}
                  </Typography>
                </Stack>
              </CardContent>
            </CardActionArea>
          </Card>
        </li>
      ))}
    </Stack>
  );
}
