import { z } from 'zod';
import type { CreateInvoiceRequest } from '../api/types';

export const CURRENCIES = ['AUD', 'USD', 'GBP', 'EUR', 'SGD', 'NZD', 'JPY', 'VND'] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONEY = /^\d+(\.\d{1,2})?$/;

const isValidDate = (value: string) => {
  if (!DATE_ONLY.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
};

const optionalText = (max: number) =>
  z.string().trim().max(max, `Must be at most ${max} characters`);

const requiredDate = (label: string) =>
  z.string().min(1, `${label} is required`).refine(isValidDate, `${label} must be a valid date`);

/**
 * Form values are strings (as typed); the schema validates them with the same
 * rules as the API and converts to the request shape. The server re-validates
 * everything and computes all totals.
 */
export const createInvoiceSchema = z
  .object({
    invoiceNumber: z
      .string()
      .trim()
      .min(1, 'Invoice number is required')
      .max(50, 'Must be at most 50 characters'),
    invoiceReference: optionalText(100),
    invoiceDate: requiredDate('Invoice date'),
    dueDate: requiredDate('Due date'),
    currency: z.enum(CURRENCIES, { errorMap: () => ({ message: 'Select a currency' }) }),
    description: optionalText(1000),
    customer: z.object({
      fullname: z
        .string()
        .trim()
        .min(1, 'Customer name is required')
        .max(255, 'Must be at most 255 characters'),
      email: z
        .string()
        .trim()
        .min(1, 'Customer email is required')
        .email('Enter a valid email address'),
      mobileNumber: optionalText(30),
      address: optionalText(500),
    }),
    item: z.object({
      name: z
        .string()
        .trim()
        .min(1, 'Item name is required')
        .max(255, 'Must be at most 255 characters'),
      quantity: z
        .string()
        .trim()
        .min(1, 'Quantity is required')
        .refine((v) => /^\d+$/.test(v) && Number(v) > 0, 'Quantity must be a positive whole number')
        .refine((v) => Number(v) <= 1_000_000, 'Quantity is too large'),
      rate: z
        .string()
        .trim()
        .min(1, 'Rate is required')
        .refine(
          (v) => MONEY.test(v) && Number(v) > 0,
          'Rate must be a positive amount (max 2 decimals)',
        ),
    }),
    taxRate: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || (MONEY.test(v) && Number(v) <= 100),
        'Tax must be between 0 and 100 (max 2 decimals)',
      ),
    discount: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || MONEY.test(v),
        'Discount must be a non-negative amount (max 2 decimals)',
      ),
  })
  .refine(
    (v) => !isValidDate(v.invoiceDate) || !isValidDate(v.dueDate) || v.dueDate >= v.invoiceDate,
    {
      message: 'Due date must be on or after the invoice date',
      path: ['dueDate'],
    },
  );

export type CreateInvoiceFormValues = z.input<typeof createInvoiceSchema>;

export function toCreateInvoiceRequest(values: CreateInvoiceFormValues): CreateInvoiceRequest {
  const optional = (value: string | undefined) => value?.trim() || undefined;
  return {
    invoiceNumber: values.invoiceNumber.trim(),
    invoiceReference: optional(values.invoiceReference),
    invoiceDate: values.invoiceDate,
    dueDate: values.dueDate,
    currency: values.currency,
    description: optional(values.description),
    customer: {
      fullname: values.customer.fullname.trim(),
      email: values.customer.email.trim(),
      mobileNumber: optional(values.customer.mobileNumber),
      address: optional(values.customer.address),
    },
    items: [
      {
        name: values.item.name.trim(),
        quantity: Number(values.item.quantity),
        rate: Number(values.item.rate),
      },
    ],
    // Blank means "use the default" (10% tax, no discount), as in the spec.
    taxRate: values.taxRate.trim() === '' ? 10 : Number(values.taxRate),
    discount: values.discount.trim() === '' ? 0 : Number(values.discount),
  };
}

/**
 * Maps a backend validation message (e.g. "items.0.rate must be ...",
 * "customer.email must be an email") to the form field it belongs to.
 */
export function fieldForServerMessage(message: string): FormFieldPath | undefined {
  const path = message.split(' ')[0];
  return SERVER_FIELD_MAP[path as keyof typeof SERVER_FIELD_MAP];
}

const SERVER_FIELD_MAP = {
  invoiceNumber: 'invoiceNumber',
  invoiceReference: 'invoiceReference',
  invoiceDate: 'invoiceDate',
  dueDate: 'dueDate',
  currency: 'currency',
  description: 'description',
  'customer.fullname': 'customer.fullname',
  'customer.email': 'customer.email',
  'customer.mobileNumber': 'customer.mobileNumber',
  'customer.address': 'customer.address',
  'items.0.name': 'item.name',
  'items.0.quantity': 'item.quantity',
  'items.0.rate': 'item.rate',
  taxRate: 'taxRate',
  discount: 'discount',
} as const;

export type FormFieldPath = (typeof SERVER_FIELD_MAP)[keyof typeof SERVER_FIELD_MAP];
