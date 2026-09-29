import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Flattens class-validator errors into messages like `items.0.rate must be a
 * positive number`. Unlike Nest's default, a property's own errors (e.g.
 * "items must contain no more than 1 elements") are kept even when its
 * nested children also fail.
 */
export function flattenValidationErrors(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const prefix = parentPath ? `${parentPath}.` : '';
    const own = Object.values(error.constraints ?? {}).map((message) => `${prefix}${message}`);
    const nested = flattenValidationErrors(error.children ?? [], `${prefix}${error.property}`);
    return [...own, ...nested];
  });
}

export const validationExceptionFactory = (errors: ValidationError[]) =>
  new BadRequestException(flattenValidationErrors(errors));
