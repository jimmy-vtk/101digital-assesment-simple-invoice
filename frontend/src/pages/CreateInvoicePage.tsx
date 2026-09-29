import { zodResolver } from '@hookform/resolvers/zod';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { invoicesApi, queryKeys } from '../api/endpoints';
import {
  createInvoiceSchema,
  CURRENCIES,
  fieldForServerMessage,
  toCreateInvoiceRequest,
  type CreateInvoiceFormValues,
} from '../invoices/createInvoiceSchema';
import { addDays, todayLocal } from '../utils/format';

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" component="fieldset" sx={{ p: { xs: 2, sm: 3 }, m: 0, minWidth: 0 }}>
      <Typography
        variant="h2"
        component="legend"
        sx={{ float: 'left', width: '100%', mb: description ? 0.5 : 2 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ clear: 'both', mb: 2 }}>
          {description}
        </Typography>
      )}
      <Grid container spacing={2} sx={{ clear: 'both' }}>
        {children}
      </Grid>
    </Paper>
  );
}

export function CreateInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const today = todayLocal();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceReference: '',
      invoiceDate: today,
      dueDate: addDays(today, 30),
      currency: 'AUD',
      description: '',
      customer: { fullname: '', email: '', mobileNumber: '', address: '' },
      item: { name: '', quantity: '1', rate: '' },
      taxRate: '10',
      discount: '0',
    },
  });

  const mutation = useMutation({
    mutationFn: invoicesApi.create,
    onSuccess: async (invoice) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
      enqueueSnackbar(`Invoice ${invoice.invoiceNumber} created`, { variant: 'success' });
      navigate('/');
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        setFormErrors(['Something went wrong. Please try again.']);
        return;
      }
      if (error.status === 409) {
        setError(
          'invoiceNumber',
          { message: 'This invoice number is already in use' },
          { shouldFocus: true },
        );
        return;
      }
      // Attach server validation messages to their fields; show the rest at the top.
      const unmatched: string[] = [];
      for (const message of error.messages) {
        const field = fieldForServerMessage(message);
        if (field && error.status === 400) setError(field, { message });
        else unmatched.push(message);
      }
      setFormErrors(unmatched);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormErrors([]);
    mutation.mutate(toCreateInvoiceRequest(values));
  });

  const errorAt = (path: FieldPath<CreateInvoiceFormValues>) =>
    path
      .split('.')
      .reduce<unknown>(
        (node, key) => (node as Record<string, unknown> | undefined)?.[key],
        errors,
      ) as { message?: string } | undefined;

  /** Wires a text field to react-hook-form with its validation message. */
  const field = (path: FieldPath<CreateInvoiceFormValues>, props: TextFieldProps) => (
    <TextField
      fullWidth
      {...props}
      {...register(path)}
      error={!!errorAt(path)}
      helperText={errorAt(path)?.message ?? props.helperText}
    />
  );

  return (
    <Stack spacing={3} component="form" noValidate onSubmit={onSubmit} aria-label="Create invoice">
      <Button
        component={RouterLink}
        to="/"
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to invoices
      </Button>
      <Typography variant="h1">New invoice</Typography>

      {formErrors.length > 0 && (
        <Alert severity="error" role="alert">
          {formErrors.length === 1 ? (
            formErrors[0]
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {formErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <FormSection title="Customer">
        <Grid size={{ xs: 12, sm: 6 }}>
          {field('customer.fullname', {
            label: 'Customer name',
            required: true,
            autoComplete: 'name',
          })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {field('customer.email', {
            label: 'Customer email',
            type: 'email',
            required: true,
            autoComplete: 'email',
          })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {field('customer.mobileNumber', {
            label: 'Mobile number',
            type: 'tel',
            autoComplete: 'tel',
          })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          {field('customer.address', { label: 'Address', autoComplete: 'street-address' })}
        </Grid>
      </FormSection>

      <FormSection title="Invoice details">
        <Grid size={{ xs: 12, sm: 6 }}>
          {field('invoiceNumber', {
            label: 'Invoice number',
            required: true,
            helperText: 'Must be unique',
          })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{field('invoiceReference', { label: 'Reference' })}</Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          {field('invoiceDate', {
            label: 'Invoice date',
            type: 'date',
            required: true,
            slotProps: { inputLabel: { shrink: true } },
          })}
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          {field('dueDate', {
            label: 'Due date',
            type: 'date',
            required: true,
            slotProps: { inputLabel: { shrink: true } },
          })}
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Controller
            name="currency"
            control={control}
            render={({ field: { ref, ...rest }, fieldState }) => (
              <TextField
                {...rest}
                inputRef={ref}
                select
                fullWidth
                required
                label="Currency"
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              >
                {CURRENCIES.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Grid>
        <Grid size={12}>
          {field('description', { label: 'Description', multiline: true, minRows: 2 })}
        </Grid>
      </FormSection>

      <FormSection
        title="Line item"
        description="Totals (subtotal, tax and total) are calculated by the server when you save."
      >
        <Grid size={{ xs: 12, md: 6 }}>
          {field('item.name', { label: 'Item name', required: true })}
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          {field('item.quantity', {
            label: 'Quantity',
            required: true,
            slotProps: { htmlInput: { inputMode: 'numeric' } },
          })}
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          {field('item.rate', {
            label: 'Rate',
            required: true,
            slotProps: { htmlInput: { inputMode: 'decimal' } },
          })}
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          {field('taxRate', {
            label: 'Tax',
            helperText: 'Defaults to 10%',
            slotProps: {
              htmlInput: { inputMode: 'decimal' },
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
            },
          })}
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          {field('discount', {
            label: 'Discount',
            helperText: 'Flat amount',
            slotProps: { htmlInput: { inputMode: 'decimal' } },
          })}
        </Grid>
      </FormSection>

      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'flex-end' }}
      >
        <Button component={RouterLink} to="/" disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" size="large" loading={mutation.isPending}>
          Create invoice
        </Button>
      </Stack>
    </Stack>
  );
}
