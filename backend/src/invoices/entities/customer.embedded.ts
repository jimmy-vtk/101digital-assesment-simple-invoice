import { Column } from 'typeorm';

/**
 * Customer details are embedded in the invoice row (columns prefixed
 * `customer_`). An invoice is a legal snapshot: later edits to a customer
 * must not rewrite historical invoices.
 */
export class Customer {
  @Column({ type: 'varchar', length: 255 })
  fullname: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  mobileNumber: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;
}
