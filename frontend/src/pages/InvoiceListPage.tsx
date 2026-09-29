import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router';
import { invoicesApi, queryKeys } from '../api/endpoints';
import type { SortField } from '../api/types';
import { InvoiceCardList } from '../invoices/InvoiceCardList';
import { InvoiceFilters } from '../invoices/InvoiceFilters';
import { InvoiceTable } from '../invoices/InvoiceTable';
import { PAGE_SIZE_OPTIONS, useInvoiceQueryParams } from '../invoices/useInvoiceQueryParams';

export function InvoiceListPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { query, update, reset, hasFilters } = useInvoiceQueryParams();

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: queryKeys.invoiceList(query),
    queryFn: () => invoicesApi.list(query),
    // Keep showing the current page while the next one loads (no flicker).
    placeholderData: keepPreviousData,
  });

  const onSort = (field: SortField) =>
    update({
      sortBy: field,
      // Clicking the active column flips direction; a new column starts descending.
      ordering: query.sortBy === field && query.ordering === 'DESC' ? 'ASC' : 'DESC',
    });

  const invoices = data?.data ?? [];
  const total = data?.paging.total ?? 0;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="h1">Invoices</Typography>
        <Button
          component={RouterLink}
          to="/invoices/new"
          variant="contained"
          startIcon={<AddIcon />}
        >
          New invoice
        </Button>
      </Stack>

      <InvoiceFilters query={query} hasFilters={hasFilters} onChange={update} onReset={reset} />

      <Paper variant="outlined" sx={{ overflow: 'hidden', position: 'relative' }}>
        <Box sx={{ height: 4 }}>
          {isFetching && !isPending && <LinearProgress aria-label="Loading invoices" />}
        </Box>

        {isPending ? (
          <Stack spacing={1} sx={{ p: 2 }} aria-busy="true" aria-label="Loading invoices">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} variant="rounded" height={44} />
            ))}
          </Stack>
        ) : isError ? (
          <Alert
            severity="error"
            sx={{ m: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Retry
              </Button>
            }
          >
            {error.message}
          </Alert>
        ) : invoices.length === 0 ? (
          <Stack spacing={1} sx={{ py: 6, px: 2, alignItems: 'center', textAlign: 'center' }}>
            <Typography variant="h2">
              {hasFilters ? 'No matching invoices' : 'No invoices yet'}
            </Typography>
            <Typography color="text.secondary">
              {hasFilters
                ? 'Try a different search or clear the filters.'
                : 'Create your first invoice to get started.'}
            </Typography>
            {hasFilters && <Button onClick={reset}>Clear filters</Button>}
          </Stack>
        ) : isDesktop ? (
          <InvoiceTable invoices={invoices} query={query} onSort={onSort} />
        ) : (
          <Box sx={{ p: 1.5 }}>
            <InvoiceCardList invoices={invoices} />
          </Box>
        )}

        {!isPending && !isError && total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={Math.min(query.page - 1, Math.max(0, Math.ceil(total / query.pageSize) - 1))}
            rowsPerPage={query.pageSize}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(_, page) => update({ page: page + 1 })}
            onRowsPerPageChange={(e) => update({ pageSize: Number(e.target.value) })}
            labelRowsPerPage={isDesktop ? 'Rows per page:' : 'Rows:'}
            sx={{ borderTop: 1, borderColor: 'divider' }}
          />
        )}
      </Paper>
    </Stack>
  );
}
