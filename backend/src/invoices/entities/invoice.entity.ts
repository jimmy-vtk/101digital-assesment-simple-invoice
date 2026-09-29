import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { User } from '../../users/user.entity';
import { PersistedInvoiceStatus } from '../invoice-status';
import { Customer } from './customer.embedded';
import { InvoiceItem } from './invoice-item.entity';

const money = {
  type: 'numeric',
  precision: 14,
  scale: 2,
  transformer: decimalTransformer,
} as const;

export const INVOICE_NUMBER_UNIQUE = 'UQ_invoices_invoice_number';

@Entity('invoices')
@Unique(INVOICE_NUMBER_UNIQUE, ['invoiceNumber'])
@Check('CHK_invoices_due_date', '"due_date" >= "invoice_date"')
@Check('CHK_invoices_tax_rate', '"tax_rate" >= 0 AND "tax_rate" <= 100')
@Check(
  'CHK_invoices_amounts',
  '"invoice_sub_total" >= 0 AND "total_tax" >= 0 AND "total_discount" >= 0 AND "total_amount" >= 0 AND "total_paid" >= 0',
)
@Check('CHK_invoices_balance', '"balance_amount" = "total_amount" - "total_paid"')
@Index('IDX_invoices_status_due_date', ['status', 'dueDate'])
@Index('IDX_invoices_invoice_date', ['invoiceDate'])
@Index('IDX_invoices_due_date', ['dueDate'])
@Index('IDX_invoices_total_amount', ['totalAmount'])
@Index('IDX_invoices_created_by', ['createdBy'])
// Trigram indexes for ILIKE search; created in SQL by the migration.
@Index('IDX_invoices_invoice_number_trgm', { synchronize: false })
@Index('IDX_invoices_customer_fullname_trgm', { synchronize: false })
export class Invoice {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_invoices' })
  invoiceId: string;

  @Column({ type: 'varchar', length: 50 })
  invoiceNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  invoiceReference: string | null;

  /** `YYYY-MM-DD`; pg returns DATE as a string, avoiding timezone shifts. */
  @Column({ type: 'date' })
  invoiceDate: string;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'char', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 10 })
  currencySymbol: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PersistedInvoiceStatus,
    enumName: 'invoice_status',
    default: PersistedInvoiceStatus.Draft,
  })
  status: PersistedInvoiceStatus;

  @Column(() => Customer)
  customer: Customer;

  /** Tax percentage applied to the subtotal (not in the spec's model; kept for auditability). */
  @Column({ type: 'numeric', precision: 5, scale: 2, transformer: decimalTransformer })
  taxRate: number;

  @Column(money)
  invoiceSubTotal: number;

  @Column(money)
  totalTax: number;

  @Column(money)
  totalDiscount: number;

  @Column(money)
  totalAmount: number;

  @Column({ ...money, default: 0 })
  totalPaid: number;

  @Column(money)
  balanceAmount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'FK_invoices_created_by' })
  creator?: User;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: ['insert'] })
  items: InvoiceItem[];
}
