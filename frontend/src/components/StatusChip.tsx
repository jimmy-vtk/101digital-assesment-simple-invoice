import Chip, { type ChipProps } from '@mui/material/Chip';
import type { InvoiceStatus } from '../api/types';

const COLORS: Record<InvoiceStatus, ChipProps['color']> = {
  Draft: 'default',
  Pending: 'info',
  Paid: 'success',
  Overdue: 'error',
};

export function StatusChip({
  status,
  size = 'small',
}: {
  status: InvoiceStatus;
  size?: ChipProps['size'];
}) {
  return <Chip label={status} color={COLORS[status]} size={size} variant="outlined" />;
}
