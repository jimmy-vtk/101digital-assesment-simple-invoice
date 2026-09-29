import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../invoice-status';

export class CustomerResponseDto {
  @ApiProperty({ example: 'Paul' })
  fullname: string;

  @ApiProperty({ example: 'paul@101digital.io' })
  email: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '947717364111' })
  mobileNumber: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Singapore' })
  address: string | null;
}

export class InvoiceItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Honda RC150' })
  name: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 1000 })
  rate: number;

  @ApiProperty({ example: 2000, description: 'quantity × rate' })
  amount: number;
}

export class InvoiceSummaryDto {
  @ApiProperty({ format: 'uuid' })
  invoiceId: string;

  @ApiProperty({ example: 'IV1780488206995' })
  invoiceNumber: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '#5721662' })
  invoiceReference: string | null;

  @ApiProperty({ example: '2026-06-03', format: 'date' })
  invoiceDate: string;

  @ApiProperty({ example: '2026-07-03', format: 'date' })
  dueDate: string;

  @ApiProperty({ example: 'AUD' })
  currency: string;

  @ApiProperty({ example: 'AU$' })
  currencySymbol: string;

  @ApiProperty({ type: CustomerResponseDto })
  customer: CustomerResponseDto;

  @ApiProperty({ example: 2180 })
  totalAmount: number;

  @ApiProperty({ example: 728.66 })
  balanceAmount: number;

  @ApiProperty({ enum: InvoiceStatus, description: 'Overdue is derived: unpaid and past due date' })
  status: InvoiceStatus;
}

export class InvoiceDetailDto extends InvoiceSummaryDto {
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Invoice is issued to Kanglee' })
  description: string | null;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  items: InvoiceItemResponseDto[];

  @ApiProperty({ example: 10, description: 'Tax percentage' })
  taxRate: number;

  @ApiProperty({ example: 2000 })
  invoiceSubTotal: number;

  @ApiProperty({ example: 200 })
  totalTax: number;

  @ApiProperty({ example: 20 })
  totalDiscount: number;

  @ApiProperty({ example: 1451.34 })
  totalPaid: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'uuid' })
  createdBy: string;
}

export class PagingDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;

  @ApiProperty({ example: 100 })
  total: number;
}

export class InvoiceListResponseDto {
  @ApiProperty({ type: [InvoiceSummaryDto] })
  data: InvoiceSummaryDto[];

  @ApiProperty({ type: PagingDto })
  paging: PagingDto;
}
