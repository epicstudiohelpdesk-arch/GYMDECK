/**
 * GymDeck Payments V2 - Invoices and member billing authority.
 * All amounts are integer minor units (paise). No floating-point arithmetic.
 */

import { getDatabasePool } from '../../shared/database';
import { AppError } from '../../shared/errors';

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  currency: string;
  totalMinor: number;
  paidMinor: number;
  refundedMinor: number;
  outstandingMinor: number;
  status: string;
  description: string | null;
  issueDate: string;
  dueDate: string | null;
  membershipId: string | null;
}

export function toInvoiceDto(row: any): InvoiceDto {
  const total = Number(row.total_minor);
  const paid = Number(row.paid_minor);
  const status = row.status as string;
  const outstanding = status === 'PAID' || status === 'VOID' ? 0 : Math.max(total - paid, 0);
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    currency: row.currency,
    totalMinor: total,
    paidMinor: paid,
    refundedMinor: Number(row.refunded_minor),
    outstandingMinor: outstanding,
    status,
    description: row.description,
    issueDate: row.issue_date instanceof Date ? row.issue_date.toISOString().slice(0, 10) : row.issue_date,
    dueDate: row.due_date instanceof Date ? row.due_date.toISOString().slice(0, 10) : row.due_date,
    membershipId: row.membership_id,
  };
}

export async function getGymPaymentSettings(gymId: string) {
  const pool = getDatabasePool();
  const res = await pool.query(`SELECT * FROM gym_payment_settings WHERE gym_id = $1`, [gymId]);
  return (
    res.rows[0] || {
      gym_id: gymId,
      allow_partial_payments: false,
      allow_overpayment: false,
      activate_membership_on_partial: false,
      invoice_prefix: 'INV',
      receipt_prefix: 'REC',
      gst_enabled: false,
      gstin: null,
      legal_business_name: null,
      place_of_supply: null,
      default_tax_rate_bps: 0,
      receipt_footer: null,
    }
  );
}

type Queryable = { query: (sql: string, params?: any[]) => Promise<any> };

async function nextNumber(client: Queryable, gymId: string, prefix: string, table: 'invoices' | 'payment_receipts') {
  const column = table === 'invoices' ? 'invoice_number' : 'receipt_number';
  const year = new Date().getFullYear();
  const res = await client.query(
    `SELECT COUNT(*)::int AS c FROM ${table} WHERE gym_id = $1 AND ${column} LIKE $2`,
    [gymId, `${prefix}-${year}-%`]
  );
  const seq = Number(res.rows[0]?.c || 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

export class InvoiceService {
  /** Creates an OPEN invoice for a membership. Idempotent per membership. */
  public async createFromMembership(
    gymId: string,
    memberId: string,
    membershipId: string,
    totalMinor: number,
    description: string,
    dueDate?: string,
    existingClient?: Queryable
  ): Promise<InvoiceDto> {
    if (!Number.isInteger(totalMinor) || totalMinor < 0) {
      throw AppError.validation('Invoice total must be a non-negative integer in minor units.');
    }
    const ownClient = !existingClient;
    const pool = getDatabasePool();
    const client = existingClient || (await pool.connect());
    try {
      if (ownClient) await (client as any).query('BEGIN');
      const existing = await client.query(
        `SELECT * FROM invoices WHERE gym_id = $1 AND membership_id = $2 LIMIT 1`,
        [gymId, membershipId]
      );
      if (existing.rows[0]) {
        if (ownClient) await (client as any).query('COMMIT');
        return toInvoiceDto(existing.rows[0]);
      }
      const settings = await getGymPaymentSettings(gymId);
      const invoiceNumber = await nextNumber(client, gymId, settings.invoice_prefix || 'INV', 'invoices');
      const inserted = await client.query(
        `INSERT INTO invoices (
           gym_id, member_id, membership_id, invoice_number, currency,
           subtotal_minor, tax_minor, total_minor, status, description, due_date
         ) VALUES ($1,$2,$3,$4,'INR',$5,0,$5,'OPEN',$6,$7) RETURNING *`,
        [gymId, memberId, membershipId, invoiceNumber, totalMinor, description, dueDate || null]
      );
      if (ownClient) await (client as any).query('COMMIT');
      return toInvoiceDto(inserted.rows[0]);
    } catch (err) {
      if (ownClient) await (client as any).query('ROLLBACK');
      throw err;
    } finally {
      if (ownClient) (client as any).release();
    }
  }

  public async listMemberInvoices(gymId: string, memberId: string): Promise<InvoiceDto[]> {
    const pool = getDatabasePool();
    const res = await pool.query(
      `SELECT * FROM invoices WHERE gym_id = $1 AND member_id = $2
       ORDER BY issue_date DESC, created_at DESC LIMIT 100`,
      [gymId, memberId]
    );
    return res.rows.map(toInvoiceDto);
  }

  public async getInvoice(gymId: string, invoiceId: string): Promise<InvoiceDto> {
    const pool = getDatabasePool();
    const res = await pool.query(`SELECT * FROM invoices WHERE id = $1 AND gym_id = $2`, [
      invoiceId,
      gymId,
    ]);
    if (!res.rows[0]) throw AppError.notFound('Invoice not found in this gym.');
    return toInvoiceDto(res.rows[0]);
  }

  /** Authoritative dues for a member, derived from invoices only. */
  public async getMemberSummary(gymId: string, memberId: string) {
    const invoices = await this.listMemberInvoices(gymId, memberId);
    const outstandingMinor = invoices.reduce((sum, inv) => sum + inv.outstandingMinor, 0);
    const pending = await getDatabasePool().query(
      `SELECT COUNT(*)::int AS c, COALESCE(SUM(amount_minor),0)::bigint AS total
       FROM payment_attempts
       WHERE gym_id = $1 AND member_id = $2 AND status IN ('SUBMITTED','PENDING_VERIFICATION')`,
      [gymId, memberId]
    );
    return {
      currency: 'INR',
      totalOutstandingMinor: outstandingMinor,
      totalOutstanding: Number((outstandingMinor / 100).toFixed(2)),
      hasDues: outstandingMinor > 0,
      openInvoices: invoices.filter((i) => i.outstandingMinor > 0),
      invoices,
      pendingVerificationCount: Number(pending.rows[0]?.c || 0),
      pendingVerificationMinor: Number(pending.rows[0]?.total || 0),
    };
  }
}

export const invoiceService = new InvoiceService();
export default invoiceService;

