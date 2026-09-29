import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEmail,
  IsInt,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsDateOnly, IsOnOrAfter } from '../../common/validators/date.validators';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Trims, and treats blank strings as "not provided" for optional fields. */
const trimToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class CustomerDto {
  @ApiProperty({ example: 'Paul' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullname: string;

  @ApiProperty({ example: 'paul@101digital.io' })
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '947717364111' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobileNumber?: string;

  @ApiPropertyOptional({ example: 'Singapore' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Honda RC150' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @IsPositive()
  @Max(1_000_000)
  quantity: number;

  @ApiProperty({ example: 1000, description: 'Unit price, up to 2 decimal places' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000)
  rate: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'IV1780488206995', description: 'Unique, user-provided' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  invoiceNumber: string;

  @ApiPropertyOptional({ example: '#5721662' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceReference?: string;

  @ApiProperty({ example: '2026-06-03', format: 'date' })
  @IsDateOnly()
  invoiceDate: string;

  @ApiProperty({
    example: '2026-07-03',
    format: 'date',
    description: 'Must be on or after invoiceDate',
  })
  @IsDateOnly()
  @IsOnOrAfter('invoiceDate')
  dueDate: string;

  @ApiProperty({ example: 'AUD', description: 'ISO 4217 currency code' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsISO4217CurrencyCode()
  currency: string;

  @ApiPropertyOptional({ example: 'Invoice is issued to Kanglee' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ type: CustomerDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({
    type: [CreateInvoiceItemDto],
    minItems: 1,
    maxItems: 1,
    description: 'Exactly one line item is supported in this version',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    minimum: 0,
    maximum: 100,
    description: 'Tax percentage',
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate: number = 10;

  @ApiPropertyOptional({ example: 20, default: 0, minimum: 0, description: 'Flat discount amount' })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  discount: number = 0;
}
