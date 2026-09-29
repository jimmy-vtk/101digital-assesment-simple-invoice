import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly, IsOnOrAfter } from '../../common/validators/date.validators';
import { InvoiceStatus } from '../invoice-status';

export const INVOICE_SORT_FIELDS = ['invoiceDate', 'dueDate', 'totalAmount'] as const;
export type InvoiceSortField = (typeof INVOICE_SORT_FIELDS)[number];

export const MAX_PAGE_SIZE = 100;

export class QueryInvoicesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: MAX_PAGE_SIZE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = 10;

  @ApiPropertyOptional({ enum: INVOICE_SORT_FIELDS, default: 'invoiceDate' })
  @IsIn(INVOICE_SORT_FIELDS)
  sortBy: InvoiceSortField = 'invoiceDate';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['ASC', 'DESC'])
  ordering: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match on invoice number or customer name',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Invoices dated on/after (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateOnly()
  fromDate?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Invoices dated on/before (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateOnly()
  @IsOnOrAfter('fromDate')
  toDate?: string;
}
