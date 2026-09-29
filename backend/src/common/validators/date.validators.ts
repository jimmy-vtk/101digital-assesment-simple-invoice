import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { isDateOnly } from '../utils/date.util';

/** Strict `YYYY-MM-DD` calendar date. */
export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isDateOnly',
      target: target.constructor,
      propertyName: propertyName as string,
      options: {
        message: '$property must be a valid date in YYYY-MM-DD format',
        ...options,
      },
      validator: { validate: (value: unknown) => isDateOnly(value) },
    });
}

/**
 * The decorated date must be on or after the date in `otherProperty`.
 * Skipped when either value is not a valid date (IsDateOnly reports that).
 */
export function IsOnOrAfter(otherProperty: string, options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isOnOrAfter',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [otherProperty],
      options: {
        message: `$property must be on or after ${otherProperty}`,
        ...options,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const other = (args.object as Record<string, unknown>)[otherProperty];
          if (!isDateOnly(value) || !isDateOnly(other)) return true;
          return value >= other;
        },
      },
    });
}
