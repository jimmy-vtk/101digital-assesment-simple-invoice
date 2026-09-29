import { zodResolver } from '@hookform/resolvers/zod';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, type Location } from 'react-router';
import { z } from 'zod';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/authContext';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128, 'Password is too long'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const from = (location.state as { from?: Location } | null)?.from;
  const destination = from ? `${from.pathname}${from.search}` : '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) return <Navigate to={destination} replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.status === 401
          ? 'Invalid email or password.'
          : error instanceof ApiError
            ? error.message
            : 'Unable to sign in. Please try again.',
      );
    }
  });

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3} component="form" noValidate onSubmit={onSubmit}>
          <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <ReceiptLongIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h1">Sign in to SimpleInvoice</Typography>
          </Stack>

          {formError && (
            <Alert severity="error" role="alert">
              {formError}
            </Alert>
          )}

          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            autoFocus
            required
            fullWidth
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            fullWidth
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
            Sign in
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
