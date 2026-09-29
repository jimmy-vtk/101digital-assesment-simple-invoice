import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import type { Invoice } from './invoice.entity';

@Entity('invoice_items')
@Check('CHK_invoice_items_quantity', '"quantity" > 0')
@Check('CHK_invoice_items_rate', '"rate" > 0')
@Index('IDX_invoice_items_invoice_id', ['invoiceId'])
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_invoice_items' })
  id: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  // String target avoids a circular import with invoice.entity.
  @ManyToOne('Invoice', 'items', { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'invoice_id', foreignKeyConstraintName: 'FK_invoice_items_invoice_id' })
  invoice?: Invoice;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: decimalTransformer })
  rate: number;
}
