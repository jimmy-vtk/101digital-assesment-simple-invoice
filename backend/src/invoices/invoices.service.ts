import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { todayUtc } from '../common/utils/date.util';
import { escapeLike, isUniqueViolation } from '../common/utils/sql.util';
import { currencySymbol } from './currency';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceDetailDto, InvoiceListResponseDto } from './dto/invoice-response.dto';
import { InvoiceSortField, QueryInvoicesDto } from './dto/query-invoices.dto';
import { Invoice, INVOICE_NUMBER_UNIQUE } from './entities/invoice.entity';
import { calculateInvoiceAmounts, InvoiceCalculationError } from './invoice-calculator';
import { InvoiceStatus, PersistedInvoiceStatus } from './invoice-status';
import { toInvoiceDetail, toInvoiceSummary } from './invoice.mapper';

const SORT_COLUMNS: Record<InvoiceSortField, string> = {
  invoiceDate: 'invoice.invoiceDate',
  dueDate: 'invoice.dueDate',
  totalAmount: 'invoice.totalAmount',
};

@Injectable()
export class InvoicesService {
  constructor(@InjectRepository(Invoice) private readonly invoices: Repository<Invoice>) {}

  async findAll(query: QueryInvoicesDto): Promise<InvoiceListResponseDto> {
    const today = todayUtc();
    const qb = this.invoices.createQueryBuilder('invoice');

    if (query.status) this.applyStatusFilter(qb, query.status, today);
    if (query.keyword) {
      const pattern = `%${escapeLike(query.keyword)}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('invoice.invoiceNumber ILIKE :pattern', { pattern })
            .orWhere('invoice.customer.fullname ILIKE :pattern', { pattern }),
        ),
      );
    }
    if (query.fromDate)
      qb.andWhere('invoice.invoiceDate >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('invoice.invoiceDate <= :toDate', { toDate: query.toDate });

    const [rows, total] = await qb
      .orderBy(SORT_COLUMNS[query.sortBy], query.ordering)
      // Tie-breaker keeps page boundaries stable when sort values repeat.
      .addOrderBy('invoice.invoiceNumber', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return {
      data: rows.map((invoice) => toInvoiceSummary(invoice, today)),
      paging: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async findOne(invoiceId: string): Promise<InvoiceDetailDto> {
    const invoice = await this.invoices.findOne({
      where: { invoiceId },
      relations: { items: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return toInvoiceDetail(invoice, todayUtc());
  }

  async create(dto: CreateInvoiceDto, userId: string): Promise<InvoiceDetailDto> {
    let amounts;
    try {
      amounts = calculateInvoiceAmounts({
        items: dto.items,
        taxRate: dto.taxRate,
        discount: dto.discount,
      });
    } catch (error) {
      if (error instanceof InvoiceCalculationError) throw new BadRequestException([error.message]);
      throw error;
    }

    const invoice = this.invoices.create({
      invoiceNumber: dto.invoiceNumber,
      invoiceReference: dto.invoiceReference ?? null,
      invoiceDate: dto.invoiceDate,
      dueDate: dto.dueDate,
      currency: dto.currency,
      currencySymbol: currencySymbol(dto.currency),
      description: dto.description ?? null,
      status: PersistedInvoiceStatus.Draft,
      customer: {
        fullname: dto.customer.fullname,
        email: dto.customer.email,
        mobileNumber: dto.customer.mobileNumber ?? null,
        address: dto.customer.address ?? null,
      },
      taxRate: dto.taxRate,
      ...amounts,
      createdBy: userId,
      items: dto.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        rate: item.rate,
      })),
    });

    try {
      // Invoice and items are inserted in one transaction (cascade).
      const saved = await this.invoices.save(invoice);
      return this.findOne(saved.invoiceId);
    } catch (error) {
      // Enforced by the DB unique constraint, so concurrent requests can't race past a pre-check.
      if (isUniqueViolation(error, INVOICE_NUMBER_UNIQUE)) {
        throw new ConflictException(`Invoice number "${dto.invoiceNumber}" already exists`);
      }
      throw error;
    }
  }

  /**
   * SQL equivalent of deriveInvoiceStatus(). Filtering happens in the query
   * (not after fetching) so pagination totals stay correct.
   */
  private applyStatusFilter(qb: SelectQueryBuilder<Invoice>, status: InvoiceStatus, today: string) {
    const paid = PersistedInvoiceStatus.Paid;
    switch (status) {
      case InvoiceStatus.Overdue:
        qb.andWhere('invoice.status <> :paid AND invoice.dueDate < :today', { paid, today });
        break;
      case InvoiceStatus.Paid:
        qb.andWhere('invoice.status = :paid', { paid });
        break;
      default:
        // Draft / Pending only while not yet overdue.
        qb.andWhere('invoice.status = :status AND invoice.dueDate >= :today', { status, today });
    }
  }
}
