import SearchIcon from '@mui/icons-material/Search';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { INVOICE_STATUSES, type InvoiceQuery, type Ordering, type SortField } from '../api/types';

const SORT_OPTIONS: { value: `${SortField}:${Ordering}`; label: string }[] = [
  { value: 'invoiceDate:DESC', label: 'Invoice date (newest first)' },
  { value: 'invoiceDate:ASC', label: 'Invoice date (oldest first)' },
  { value: 'dueDate:ASC', label: 'Due date (soonest first)' },
  { value: 'dueDate:DESC', label: 'Due date (latest first)' },
  { value: 'totalAmount:DESC', label: 'Total amount (highest first)' },
  { value: 'totalAmount:ASC', label: 'Total amount (lowest first)' },
];

const SEARCH_DEBOUNCE_MS = 350;

interface Props {
  query: InvoiceQuery;
  hasFilters: boolean;
  onChange(changes: Partial<InvoiceQuery>): void;
  onReset(): void;
}

export function InvoiceFilters({ query, hasFilters, onChange, onReset }: Props) {
  // Local state keeps typing responsive; the URL (and API call) updates after a pause.
  const [keyword, setKeyword] = useState(query.keyword ?? '');

  // When the URL keyword changes from elsewhere (back/forward, "Clear filters"),
  // show it in the box. Adjusting state during render avoids an extra effect pass.
  const [syncedKeyword, setSyncedKeyword] = useState(query.keyword);
  if (query.keyword !== syncedKeyword) {
    setSyncedKeyword(query.keyword);
    if ((query.keyword ?? '') !== keyword.trim()) setKeyword(query.keyword ?? '');
  }

  useEffect(() => {
    const trimmed = keyword.trim();
    if (trimmed === (query.keyword ?? '')) return;
    const timer = setTimeout(() => onChange({ keyword: trimmed || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword, query.keyword, onChange]);

  const dateInput = { inputLabel: { shrink: true } };

  return (
    <Grid container spacing={2} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, md: 5 }}>
        <TextField
          fullWidth
          size="small"
          label="Search"
          placeholder="Invoice number or customer name"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Search invoices', maxLength: 100 },
          }}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="Status"
          value={query.status ?? ''}
          onChange={(e) =>
            onChange({ status: (e.target.value || undefined) as InvoiceQuery['status'] })
          }
        >
          <MenuItem value="">All statuses</MenuItem>
          {INVOICE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, md: 4 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="Sort by"
          value={`${query.sortBy}:${query.ordering}`}
          onChange={(e) => {
            const [sortBy, ordering] = e.target.value.split(':') as [SortField, Ordering];
            onChange({ sortBy, ordering });
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Invoice date from"
          value={query.fromDate ?? ''}
          onChange={(e) => onChange({ fromDate: e.target.value || undefined })}
          slotProps={{ ...dateInput, htmlInput: { max: query.toDate } }}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Invoice date to"
          value={query.toDate ?? ''}
          onChange={(e) => onChange({ toDate: e.target.value || undefined })}
          slotProps={{ ...dateInput, htmlInput: { min: query.fromDate } }}
        />
      </Grid>
      {hasFilters && (
        <Grid size={{ xs: 12, md: 'auto' }}>
          <Button
            onClick={() => {
              setKeyword('');
              onReset();
            }}
          >
            Clear filters
          </Button>
        </Grid>
      )}
    </Grid>
  );
}
