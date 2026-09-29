import Decimal from 'decimal.js';
import { InvoiceDetailDto, InvoiceSummaryDto } from './dto/invoice-response.dto';
import { Invoice } from './entities/invoice.entity';
import { deriveInvoiceStatus } from './invoice-status';

export function toInvoiceSummary(invoice: Invoice, today: string): InvoiceSummaryDto {
  return {
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceReference: invoice.invoiceReference,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    currencySymbol: invoice.currencySymbol,
    customer: {
      fullname: invoice.customer.fullname,
      email: invoice.customer.email,
      mobileNumber: invoice.customer.mobileNumber,
      address: invoice.customer.address,
    },
    totalAmount: invoice.totalAmount,
    balanceAmount: invoice.balanceAmount,
    status: deriveInvoiceStatus(invoice.status, invoice.dueDate, today),
  };
}

export function toInvoiceDetail(invoice: Invoice, today: string): InvoiceDetailDto {
  return {
    ...toInvoiceSummary(invoice, today),
    description: invoice.description,
    items: (invoice.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      rate: item.rate,
      amount: new Decimal(item.quantity).times(item.rate).toDecimalPlaces(2).toNumber(),
    })),
    taxRate: invoice.taxRate,
    invoiceSubTotal: invoice.invoiceSubTotal,
    totalTax: invoice.totalTax,
    totalDiscount: invoice.totalDiscount,
    totalPaid: invoice.totalPaid,
    createdAt: invoice.createdAt,
    createdBy: invoice.createdBy,
  };
}
