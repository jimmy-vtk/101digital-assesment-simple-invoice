import { ValueTransformer } from 'typeorm';

/**
 * The pg driver returns NUMERIC columns as strings to avoid precision loss.
 * Monetary values here are NUMERIC(14,2), which fit safely in a JS number,
 * so they are exposed as numbers. Arithmetic is done with decimal.js.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
