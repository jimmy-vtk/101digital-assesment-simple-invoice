import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceDetailDto, InvoiceListResponseDto } from './dto/invoice-response.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing or invalid token' })
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with search, filter, sort and pagination' })
  @ApiOkResponse({ type: InvoiceListResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid query parameters' })
  findAll(@Query() query: QueryInvoicesDto): Promise<InvoiceListResponseDto> {
    return this.invoices.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail by ID' })
  @ApiOkResponse({ type: InvoiceDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'ID is not a valid UUID' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Invoice not found' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<InvoiceDetailDto> {
    return this.invoices.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an invoice',
    description: 'Created with status Draft. All totals are calculated server-side.',
  })
  @ApiCreatedResponse({ type: InvoiceDetailDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Invoice number already exists' })
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InvoiceDetailDto> {
    return this.invoices.create(dto, user.id);
  }
}
