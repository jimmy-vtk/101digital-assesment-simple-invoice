import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  INVOICE_STATUSES,
  SORT_FIELDS,
  type InvoiceQuery,
  type InvoiceStatus,
  type Ordering,
  type SortField,
} from '../api/types';

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
export const DEFAULT_QUERY: InvoiceQuery = {
  page: 1,
  pageSize: 10,
  sortBy: 'invoiceDate',
  ordering: 'DESC',
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function positiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** Parses list state from the URL, ignoring anything invalid (hand-edited links). */
export function parseInvoiceQuery(params: URLSearchParams): InvoiceQuery {
  const sortBy = params.get('sortBy');
  const ordering = params.get('ordering')?.toUpperCase();
  const status = params.get('status');
  const pageSize = positiveInt(params.get('pageSize'), DEFAULT_QUERY.pageSize);
  const fromDate = params.get('fromDate') ?? '';
  const toDate = params.get('toDate') ?? '';

  return {
    page: positiveInt(params.get('page'), 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_QUERY.pageSize,
    sortBy: SORT_FIELDS.includes(sortBy as SortField)
      ? (sortBy as SortField)
      : DEFAULT_QUERY.sortBy,
    ordering:
      ordering === 'ASC' || ordering === 'DESC' ? (ordering as Ordering) : DEFAULT_QUERY.ordering,
    status: INVOICE_STATUSES.includes(status as InvoiceStatus)
      ? (status as InvoiceStatus)
      : undefined,
    keyword: params.get('keyword')?.trim() || undefined,
    fromDate: DATE_ONLY.test(fromDate) ? fromDate : undefined,
    toDate: DATE_ONLY.test(toDate) ? toDate : undefined,
  };
}

/**
 * List state (search, filters, sort, page) lives in the URL so it survives
 * refreshes, works with back/forward and can be shared as a link.
 */
export function useInvoiceQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseInvoiceQuery(searchParams), [searchParams]);

  /** Applies changes; any change other than paging returns to page 1. */
  const update = useCallback(
    (changes: Partial<InvoiceQuery>) => {
      const next: InvoiceQuery = { ...query, ...changes };
      if (!('page' in changes)) next.page = 1;

      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === '') continue;
        if (value === DEFAULT_QUERY[key as keyof InvoiceQuery]) continue;
        params.set(key, String(value));
      }
      setSearchParams(params, { replace: true });
    },
    [query, setSearchParams],
  );

  const reset = useCallback(
    () => setSearchParams(new URLSearchParams(), { replace: true }),
    [setSearchParams],
  );

  const hasFilters = Boolean(query.keyword || query.status || query.fromDate || query.toDate);

  return { query, update, reset, hasFilters };
}
