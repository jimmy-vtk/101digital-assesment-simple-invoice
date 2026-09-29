import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 8 }}>
      <Typography variant="h1">Page not found</Typography>
      <Typography color="text.secondary">The page you're looking for doesn't exist.</Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go to invoices
      </Button>
    </Stack>
  );
}
