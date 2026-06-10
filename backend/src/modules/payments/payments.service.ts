import type { PoolClient } from 'pg';
import jwt from 'jsonwebtoken';
import pool from '../../config/db.ts';
import * as notificationsService from '../notifications/notifications.service.ts';
import type {
  CashfreePaymentRequestResult,
  ConfirmPaymentDTO,
  ConfirmPaymentWebhookDTO,
  CreateCashfreePaymentRequestDTO,
  Payment,
  PaymentAlertSummary,
  PaymentCommunication,
  PaymentCommunicationQueryOptions,
  PaymentHistoryPage,
  PaymentHistoryQueryOptions,
  PaymentCommunicationRequestChannel,
  PaymentReminderBatchResult,
  PaymentReminderStage,
  PaymentVerificationSource,
  PaymentWithStudent,
  PendingPayment,
  PublicPaymentDetails,
  RecordPaymentDTO,
  MonthlyRevenue,
  ReceiptData,
} from './payments.types.ts';
import {
  buildMockCashfreeWebhookPayload,
  createCashfreePaymentSession,
} from './payments.cashfree.ts';
import {
  buildReceiptMessage,
  buildReminderMessage,
  dispatchPaymentCommunication,
  resolveRequestedChannels,
} from './payments.communication.ts';

export const PAYMENT_CYCLE_DAYS = 30;
export const PAYMENT_CYCLE_END_OFFSET = PAYMENT_CYCLE_DAYS - 1;
const DUE_SOON_WINDOW_DAYS = 7;
const PUBLIC_PAYMENT_LINK_EXPIRES_IN = process.env.PAYMENT_PUBLIC_LINK_EXPIRES_IN || '48h';
const PAYMENT_HISTORY_SELECT_FIELDS = `
  p.id,
  p.payment_date,
  p.coverage_start_date,
  p.coverage_end_date,
  p.amount,
  p.fee_month,
  p.fee_year,
  p.payment_method,
  p.transaction_id,
  p.status,
  p.gateway_provider,
  p.gateway_mode,
  p.gateway_session_id,
  p.gateway_cf_order_id,
  p.gateway_checkout_url,
  p.gateway_upi_intent,
  p.gateway_order_status,
  p.gateway_expires_at,
  p.collected_by,
  p.receipt_number,
  p.verification_source,
  p.verification_reference,
  p.verified_at,
  p.verified_by,
  p.notes,
  p.created_at,
  p.updated_at,
  p.student_id,
  s.name as student_name,
  s.student_id as student_code,
  s.email as student_email,
  s.phone as student_phone,
  s.branch_id,
  b.name as branch_name
`;
const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_HORIZONTAL_MARGIN = 40;
const PDF_TITLE_Y = 805;
const PDF_TEXT_START_Y = 782;
const PDF_LINE_HEIGHT = 12;
const PDF_TABLE_LINES_PER_PAGE = 40;

interface StudentPaymentSnapshot {
  student_id: number;
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  branch_id: number;
  branch_name: string;
  monthly_fee: string | number;
  registration_date: string;
  last_payment_date: string | null;
  paid_through_date: string | null;
  last_paid_fee_month: number | null;
  last_paid_fee_year: number | null;
}

interface StudentPaymentRecord {
  id: number;
  name: string;
  student_code: string;
  email: string | null;
  phone: string;
  branch_id: number;
  branch_name: string;
  monthly_fee: string | number;
}

interface LatestReminderSnapshot {
  student_id: number;
  sent_at: Date;
  channel: 'sms' | 'whatsapp';
  reminder_stage: PaymentReminderStage;
}

interface PaymentCommunicationRow extends PaymentCommunication {
  receipt_snapshot: ReceiptData | null;
}

interface LockedPaymentRecord extends Payment {
  student_name: string;
  student_code: string;
  student_email: string | null;
  student_phone: string;
  branch_id: number;
  branch_name: string;
}

interface PaymentHistoryReportSummary {
  total_records: number;
  total_amount: number;
  paid_amount: number;
  paid_count: number;
  pending_count: number;
  failed_count: number;
  refunded_count: number;
}

interface MonthlyPaymentHistoryReport {
  month: number;
  year: number;
  scope_label: string;
  generated_at: Date;
  payments: PaymentWithStudent[];
  summary: PaymentHistoryReportSummary;
}

interface PublicPaymentAccessPayload extends jwt.JwtPayload {
  scope: 'payment_public';
  paymentId: number;
}

export function parseDateOnly(value: string): Date {
  const [yearPart = '1970', monthPart = '1', dayPart = '1'] = value.split('-');
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: Date, days: number): Date {
  const nextValue = new Date(value);
  nextValue.setUTCDate(nextValue.getUTCDate() + days);
  return nextValue;
}

function diffDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function getPublicPaymentLinkSecret(): string {
  const configuredSecret =
    process.env.PAYMENT_PUBLIC_LINK_SECRET?.trim() || process.env.JWT_SECRET?.trim();

  if (!configuredSecret) {
    throw new Error('PAYMENT_PUBLIC_LINK_SECRET or JWT_SECRET must be configured');
  }

  return configuredSecret;
}

function getPublicPaymentBaseUrl(): string {
  return (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000')
    .replace(/\/+$/, '');
}

function getPublicPaymentAccessExpiry(accessToken: string): Date | null {
  const decoded = jwt.decode(accessToken) as jwt.JwtPayload | null;

  if (typeof decoded?.exp !== 'number') {
    return null;
  }

  return new Date(decoded.exp * 1000);
}

function generatePublicPaymentAccessToken(paymentId: number): string {
  return jwt.sign(
    {
      scope: 'payment_public',
      paymentId,
    } satisfies PublicPaymentAccessPayload,
    getPublicPaymentLinkSecret(),
    {
      expiresIn: PUBLIC_PAYMENT_LINK_EXPIRES_IN,
    } as jwt.SignOptions,
  );
}

function resolvePublicPaymentIdFromAccessToken(accessToken: string): number | null {
  try {
    const decoded = jwt.verify(
      accessToken,
      getPublicPaymentLinkSecret(),
    ) as PublicPaymentAccessPayload;

    if (decoded.scope !== 'payment_public' || !Number.isInteger(decoded.paymentId)) {
      return null;
    }

    return decoded.paymentId;
  } catch {
    return null;
  }
}

export function buildPublicPaymentUrl(accessToken: string): string {
  return `${getPublicPaymentBaseUrl()}/pay/${encodeURIComponent(accessToken)}`;
}

function buildPaymentHistoryFromClause(
  options: PaymentHistoryQueryOptions = {},
): { fromClause: string; params: Array<number | string> } {
  const params: Array<number | string> = [];
  let fromClause = `
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON s.branch_id = b.id
    WHERE 1=1
  `;

  if (options.month) {
    params.push(options.month);
    fromClause += ` AND EXTRACT(MONTH FROM p.payment_date) = $${params.length}`;
  }

  if (options.year) {
    params.push(options.year);
    fromClause += ` AND EXTRACT(YEAR FROM p.payment_date) = $${params.length}`;
  }

  if (options.branchId != null) {
    params.push(options.branchId);
    fromClause += ` AND s.branch_id = $${params.length}`;
  }

  const normalizedSearch = options.search?.trim().toLowerCase();
  if (normalizedSearch) {
    params.push(`%${normalizedSearch}%`);
    fromClause += `
      AND (
        LOWER(s.name) LIKE $${params.length}
        OR LOWER(s.student_id) LIKE $${params.length}
        OR LOWER(b.name) LIKE $${params.length}
        OR LOWER(p.receipt_number) LIKE $${params.length}
        OR LOWER(COALESCE(p.transaction_id, '')) LIKE $${params.length}
      )
    `;
  }

  return { fromClause, params };
}

function getMonthLabel(month: number): string {
  return new Date(Date.UTC(2026, month - 1, 1)).toLocaleString('en-IN', {
    month: 'long',
  });
}

function formatCurrencyText(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatReportDateTime(value: Date | null): string {
  if (!value) {
    return '-';
  }

  return value.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sanitizePdfText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdfText(value: string): string {
  return sanitizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function fitPdfColumn(value: string, width: number, align: 'left' | 'right' = 'left'): string {
  const safeValue = sanitizePdfText(value);
  const truncatedValue =
    safeValue.length > width
      ? `${safeValue.slice(0, Math.max(width - 1, 0))}.`
      : safeValue;

  if (align === 'right') {
    return truncatedValue.padStart(width, ' ');
  }

  return truncatedValue.padEnd(width, ' ');
}

function buildPaymentReportLine(payment: PaymentWithStudent): string {
  const activityLabel =
    payment.status === 'pending'
      ? formatReportDateTime(payment.created_at)
      : formatReportDateTime(payment.verified_at ?? payment.payment_date);

  return [
    fitPdfColumn(formatDateOnly(payment.payment_date), 10),
    fitPdfColumn(payment.student_name, 18),
    fitPdfColumn(payment.branch_name ?? '-', 14),
    fitPdfColumn(payment.receipt_number, 16),
    fitPdfColumn(formatCurrencyText(payment.amount), 12, 'right'),
    fitPdfColumn(payment.status.toUpperCase(), 10),
    fitPdfColumn(activityLabel, 18),
  ].join(' | ');
}

function buildPdfDocument(title: string, bodyPages: string[][]): Buffer {
  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];
  let nextObjectNumber = 4;

  for (let index = 0; index < bodyPages.length; index += 1) {
    pageObjectNumbers.push(nextObjectNumber);
    contentObjectNumbers.push(nextObjectNumber + 1);
    nextObjectNumber += 2;
  }

  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Count ${bodyPages.length} /Kids [${pageObjectNumbers
    .map((number) => `${number} 0 R`)
    .join(' ')}] >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  bodyPages.forEach((lines, index) => {
    const pageNumber = index + 1;
    const totalPages = bodyPages.length;
    const contentObjectNumber = contentObjectNumbers[index]!;
    const pageObjectNumber = pageObjectNumbers[index]!;
    const textLines = lines.map((line) => `(${escapePdfText(line)}) Tj`).join('\nT*\n');
    const contentStream = [
      'BT',
      '/F1 13 Tf',
      `${PDF_HORIZONTAL_MARGIN} ${PDF_TITLE_Y} Td`,
      `(${escapePdfText(title)}) Tj`,
      'ET',
      'BT',
      '/F1 9 Tf',
      `${PDF_LINE_HEIGHT} TL`,
      `${PDF_HORIZONTAL_MARGIN} ${PDF_TEXT_START_Y} Td`,
      textLines,
      'ET',
      'BT',
      '/F1 8 Tf',
      `${PDF_PAGE_WIDTH - PDF_HORIZONTAL_MARGIN - 90} 24 Td`,
      `(Page ${pageNumber} of ${totalPages}) Tj`,
      'ET',
    ].join('\n');

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] =
      `<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream`;
  });

  const maxObjectNumber = nextObjectNumber - 1;
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
    offsets[objectNumber] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${objectNumber} 0 obj\n${objects[objectNumber]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${maxObjectNumber + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
    pdf += `${String(offsets[objectNumber]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxObjectNumber + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

async function getPaymentHistoryScopeLabel(branchId?: number): Promise<string> {
  if (branchId == null) {
    return 'All Branches';
  }

  const result = await pool.query<{ name: string }>(
    `
      SELECT name
      FROM branches
      WHERE id = $1
      LIMIT 1
    `,
    [branchId],
  );

  return result.rows[0]?.name ?? `Branch ${branchId}`;
}

function buildMonthlyPaymentHistoryPdf(report: MonthlyPaymentHistoryReport): Buffer {
  const summaryLines = [
    `Month: ${getMonthLabel(report.month)} ${report.year}`,
    `Scope: ${report.scope_label}`,
    `Generated: ${formatReportDateTime(report.generated_at)}`,
    `Records: ${report.summary.total_records}`,
    `Total Amount: ${formatCurrencyText(report.summary.total_amount)}`,
    `Paid Amount: ${formatCurrencyText(report.summary.paid_amount)}`,
    `Status Counts: paid=${report.summary.paid_count}, pending=${report.summary.pending_count}, failed=${report.summary.failed_count}, refunded=${report.summary.refunded_count}`,
    '',
    'Date       | Student            | Branch         | Receipt          |       Amount | Status     | Activity',
    '----------------------------------------------------------------------------------------------------------',
  ];

  const rowLines =
    report.payments.length === 0
      ? ['No payment records were found for the selected month.']
      : report.payments.map((payment) => buildPaymentReportLine(payment));

  const pages: string[][] = [];

  if (rowLines.length === 1 && report.payments.length === 0) {
    pages.push([...summaryLines, ...rowLines]);
  } else {
    for (let index = 0; index < rowLines.length; index += PDF_TABLE_LINES_PER_PAGE) {
      const chunk = rowLines.slice(index, index + PDF_TABLE_LINES_PER_PAGE);
      pages.push(
        index === 0
          ? [...summaryLines, ...chunk]
          : [
              `Month: ${getMonthLabel(report.month)} ${report.year} | Scope: ${report.scope_label}`,
              '',
              'Date       | Student            | Branch         | Receipt          |       Amount | Status     | Activity',
              '----------------------------------------------------------------------------------------------------------',
              ...chunk,
            ],
      );
    }
  }

  return buildPdfDocument(
    `Coffee aur Kitaab Payment History Report`,
    pages,
  );
}

function normalizeConfirmedAt(value?: string): Date {
  if (!value) {
    return new Date();
  }

  const parsedValue = new Date(value);

  if (!isValidDate(parsedValue)) {
    throw new Error('Invalid confirmed_at value');
  }

  return parsedValue;
}

function generateCashfreeOrderId(studentId: number): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CFPAY-${studentId}-${timestamp}-${randomSuffix}`;
}

export function calculateCoverageWindow(todayDate: Date, latestCoverageEnd: Date | null) {
  const coverageStartDate =
    latestCoverageEnd && latestCoverageEnd >= todayDate
      ? addDays(latestCoverageEnd, 1)
      : todayDate;
  const coverageEndDate = addDays(coverageStartDate, PAYMENT_CYCLE_END_OFFSET);

  return {
    coverageStartDate,
    coverageEndDate,
  };
}

function emitPaymentActivity(input: {
  paymentId: number;
  studentId: number;
  branchId: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
}): void {
  const ioServer = (
    globalThis as typeof globalThis & {
      io?: {
        emit: (event: string, payload: Record<string, unknown>) => void;
        to?: (room: string) => {
          emit: (event: string, payload: Record<string, unknown>) => void;
        };
      };
    }
  ).io;

  if (!ioServer) {
    return;
  }

  const payload = {
    paymentId: input.paymentId,
    studentId: input.studentId,
    branchId: input.branchId,
    status: input.status,
  };

  if (typeof ioServer.to === 'function') {
    ioServer.to('role:superadmin').emit('payment_activity', payload);
    ioServer.to(`branch:${input.branchId}`).emit('payment_activity', payload);
    return;
  }

  ioServer.emit('payment_activity', payload);
}

function shouldNotifyOnPaymentSubmission(data: RecordPaymentDTO): boolean {
  return data.gateway_provider == null;
}

function shouldNotifyOnPaymentConfirmation(payment: LockedPaymentRecord): boolean {
  return payment.gateway_provider != null;
}

async function getLatestPaidCoverage(
  db: Pick<PoolClient, 'query'>,
  studentId: number,
  excludedPaymentId?: number,
): Promise<{
  coverageEndDate: Date | null;
  paymentDate: Date | null;
}> {
  const params: Array<number> = [studentId];
  let query = `
    SELECT
      coverage_end_date::text,
      payment_date::date::text AS payment_date
    FROM fee_payments
    WHERE student_id = $1
      AND status = 'paid'
  `;

  if (excludedPaymentId != null) {
    params.push(excludedPaymentId);
    query += ` AND id <> $${params.length}`;
  }

  query += `
    ORDER BY coverage_end_date DESC, payment_date DESC, id DESC
    LIMIT 1
    FOR UPDATE
  `;

  const latestCoverageResult = await db.query<{
    coverage_end_date: string;
    payment_date: string;
  }>(query, params);

  return {
    coverageEndDate: latestCoverageResult.rows[0]?.coverage_end_date
      ? parseDateOnly(latestCoverageResult.rows[0].coverage_end_date)
      : null,
    paymentDate: latestCoverageResult.rows[0]?.payment_date
      ? parseDateOnly(latestCoverageResult.rows[0].payment_date)
      : null,
  };
}

async function getLockedPaymentRecord(
  client: PoolClient,
  paymentId: number,
  branchId?: number,
): Promise<LockedPaymentRecord | null> {
  const params: Array<number> = [paymentId];
  let query = `
    SELECT
      p.*,
      s.name AS student_name,
      s.student_id AS student_code,
      s.email AS student_email,
      s.phone AS student_phone,
      s.branch_id,
      b.name AS branch_name
    FROM fee_payments p
    JOIN students s ON s.id = p.student_id
    JOIN branches b ON b.id = s.branch_id
    WHERE p.id = $1
  `;

  if (branchId !== undefined && branchId !== null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' FOR UPDATE';

  const result = await client.query<LockedPaymentRecord>(query, params);
  return result.rows[0] ?? null;
}

async function getActiveStudentPaymentRecord(
  client: PoolClient,
  studentId: number,
  branchId?: number,
): Promise<StudentPaymentRecord> {
  const params: number[] = [studentId];
  let query = `
    SELECT
      s.id,
      s.name,
      s.student_id AS student_code,
      s.email,
      s.phone,
      s.branch_id,
      b.name AS branch_name,
      s.monthly_fee
    FROM students s
    JOIN branches b ON b.id = s.branch_id
    WHERE s.id = $1
      AND s.is_active = true
    FOR UPDATE
  `;

  if (branchId != null) {
    params.push(branchId);
    query = `
      SELECT
        s.id,
        s.name,
        s.student_id AS student_code,
        s.email,
        s.phone,
        s.branch_id,
        b.name AS branch_name,
        s.monthly_fee
      FROM students s
      JOIN branches b ON b.id = s.branch_id
      WHERE s.id = $1
        AND s.is_active = true
        AND s.branch_id = $2
      FOR UPDATE
    `;
  }

  const result = await client.query<StudentPaymentRecord>(query, params);
  const student = result.rows[0];

  if (!student) {
    throw new Error('Student not found or inactive');
  }

  return student;
}

async function getLatestReminderMap(
  studentIds: number[],
): Promise<Map<number, LatestReminderSnapshot>> {
  if (studentIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<LatestReminderSnapshot>(
    `
      SELECT DISTINCT ON (student_id)
        student_id,
        sent_at,
        channel,
        reminder_stage
      FROM payment_communications
      WHERE communication_type = 'fee_reminder'
        AND reminder_stage IS NOT NULL
        AND student_id = ANY($1)
      ORDER BY student_id, sent_at DESC, id DESC
    `,
    [studentIds],
  );

  return new Map(result.rows.map((row) => [row.student_id, row]));
}

function buildPendingPayment(today: Date, snapshot: StudentPaymentSnapshot): PendingPayment {
  const registrationDate = parseDateOnly(snapshot.registration_date);
  const paidThroughDate = snapshot.paid_through_date
    ? parseDateOnly(snapshot.paid_through_date)
    : null;
  const nextDueDate = paidThroughDate ? addDays(paidThroughDate, 1) : registrationDate;
  const daysUntilDue = diffDays(today, nextDueDate);
  const dueStatus: PendingPayment['due_status'] =
    paidThroughDate == null
      ? 'current'
      : daysUntilDue < 0
        ? 'overdue'
        : daysUntilDue === 0
          ? 'due_today'
          : daysUntilDue <= DUE_SOON_WINDOW_DAYS
          ? 'due_soon'
          : 'current';

  const pendingCycles =
    daysUntilDue <= 0 ? Math.floor(Math.abs(daysUntilDue) / PAYMENT_CYCLE_DAYS) + 1 : 0;
  const monthlyFee = Number.parseFloat(String(snapshot.monthly_fee));
  const recommendedReminderStage =
    dueStatus === 'overdue'
      ? 'overdue'
      : dueStatus === 'due_today'
        ? 'due_today'
        : daysUntilDue <= 3
          ? 'before_3_days'
          : null;

  return {
    student_id: snapshot.student_id,
    student_name: snapshot.student_name,
    student_code: snapshot.student_code,
    student_email: snapshot.student_email,
    student_phone: snapshot.student_phone,
    branch_id: snapshot.branch_id,
    branch_name: snapshot.branch_name,
    monthly_fee: monthlyFee,
    pending_cycles: pendingCycles,
    total_pending: pendingCycles * monthlyFee,
    last_payment_date: snapshot.last_payment_date ? parseDateOnly(snapshot.last_payment_date) : null,
    paid_through_date: paidThroughDate,
    next_due_date: nextDueDate,
    days_until_due: daysUntilDue,
    due_status: dueStatus,
    renewal_amount: monthlyFee,
    last_paid_fee_month: snapshot.last_paid_fee_month,
    last_paid_fee_year: snapshot.last_paid_fee_year,
    recommended_reminder_stage: recommendedReminderStage,
    last_reminder_at: null,
    last_reminder_channel: null,
    last_reminder_stage: null,
  };
}

async function getTodayDateString(): Promise<string> {
  const result = await pool.query<{ today: string }>('SELECT CURRENT_DATE::text AS today');
  return result.rows[0]?.today ?? new Date().toISOString().slice(0, 10);
}

async function getStudentPaymentSnapshots(branchId?: number): Promise<PendingPayment[]> {
  const params: number[] = [];
  let query = `
    SELECT
      s.id AS student_id,
      s.name AS student_name,
      s.student_id AS student_code,
      s.email AS student_email,
      s.phone AS student_phone,
      s.branch_id,
      b.name AS branch_name,
      s.monthly_fee,
      s.registration_date::date::text AS registration_date,
      latest.last_payment_date,
      latest.paid_through_date,
      latest.last_paid_fee_month,
      latest.last_paid_fee_year
    FROM students s
    JOIN branches b ON b.id = s.branch_id
    LEFT JOIN LATERAL (
      SELECT
        p.payment_date::date::text AS last_payment_date,
        p.coverage_end_date::text AS paid_through_date,
        p.fee_month AS last_paid_fee_month,
        p.fee_year AS last_paid_fee_year
      FROM fee_payments p
      WHERE p.student_id = s.id
        AND p.status = 'paid'
      ORDER BY p.coverage_end_date DESC, p.payment_date DESC, p.id DESC
      LIMIT 1
    ) latest ON true
    WHERE s.is_active = true
      AND s.membership_status = 'active'
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ' ORDER BY s.name ASC';

  const [snapshotResult, todayString] = await Promise.all([
    pool.query<StudentPaymentSnapshot>(query, params),
    getTodayDateString(),
  ]);

  const today = parseDateOnly(todayString);
  const pendingPayments = snapshotResult.rows.map((row) => buildPendingPayment(today, row));
  const reminderMap = await getLatestReminderMap(
    pendingPayments.map((item) => item.student_id),
  );

  return pendingPayments.map((item) => {
    const latestReminder = reminderMap.get(item.student_id);

    if (!latestReminder) {
      return item;
    }

    return {
      ...item,
      last_reminder_at: latestReminder.sent_at,
      last_reminder_channel: latestReminder.channel,
      last_reminder_stage: latestReminder.reminder_stage,
    };
  });
}

function buildPaymentAlertSummary(statuses: PendingPayment[]): PaymentAlertSummary {
  const overdue = statuses.filter((status) => status.due_status === 'overdue');
  const dueToday = statuses.filter((status) => status.due_status === 'due_today');
  const dueSoon = statuses.filter((status) => status.due_status === 'due_soon');
  const current = statuses.filter((status) => status.due_status === 'current');

  const overdueAmount = overdue.reduce((sum, item) => sum + item.total_pending, 0);
  const dueTodayAmount = dueToday.reduce((sum, item) => sum + item.total_pending, 0);
  const dueSoonAmount = dueSoon.reduce((sum, item) => sum + item.renewal_amount, 0);

  return {
    overdue_count: overdue.length,
    due_today_count: dueToday.length,
    due_soon_count: dueSoon.length,
    current_count: current.length,
    overdue_amount: overdueAmount,
    due_today_amount: dueTodayAmount,
    due_soon_amount: dueSoonAmount,
    attention_required_count: overdue.length + dueToday.length,
    attention_required_amount: overdueAmount + dueTodayAmount,
    watchlist: [...overdue, ...dueToday, ...dueSoon].sort((left, right) => {
      if (left.days_until_due !== right.days_until_due) {
        return left.days_until_due - right.days_until_due;
      }

      return left.student_name.localeCompare(right.student_name);
    }),
  };
}

async function hasReminderBeenSentToday(
  studentId: number,
  stage: PaymentReminderStage,
  channel: 'sms' | 'whatsapp',
): Promise<boolean> {
  const result = await pool.query<{ id: number }>(
    `
      SELECT id
      FROM payment_communications
      WHERE student_id = $1
        AND communication_type = 'fee_reminder'
        AND reminder_stage = $2
        AND channel = $3
        AND sent_at::date = CURRENT_DATE
      LIMIT 1
    `,
    [studentId, stage, channel],
  );

  return result.rows.length > 0;
}

async function getPaymentWithDetailsById(
  paymentId: number,
  branchId?: number,
): Promise<PaymentWithStudent | null> {
  const params: Array<number | string> = [paymentId];
  let query = `
    SELECT
      p.id,
      p.payment_date,
      p.coverage_start_date,
      p.coverage_end_date,
      p.amount,
      p.fee_month,
      p.fee_year,
      p.payment_method,
      p.transaction_id,
      p.status,
      p.gateway_provider,
      p.gateway_mode,
      p.gateway_session_id,
      p.gateway_cf_order_id,
      p.gateway_checkout_url,
      p.gateway_upi_intent,
      p.gateway_order_status,
      p.gateway_expires_at,
      p.collected_by,
      p.receipt_number,
      p.verification_source,
      p.verification_reference,
      p.verified_at,
      p.verified_by,
      p.notes,
      p.created_at,
      p.updated_at,
      p.student_id,
      s.name AS student_name,
      s.student_id AS student_code,
      s.email AS student_email,
      s.phone AS student_phone,
      s.branch_id,
      b.name AS branch_name
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON b.id = s.branch_id
    WHERE p.id = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  const result = await pool.query<PaymentWithStudent>(query, params);
  return result.rows[0] ?? null;
}

function toReceiptSnapshot(payment: PaymentWithStudent): ReceiptData {
  return {
    receipt_number: payment.receipt_number,
    student_name: payment.student_name,
    student_code: payment.student_code,
    student_email: payment.student_email,
    student_phone: payment.student_phone,
    amount: payment.amount,
    payment_date: payment.payment_date,
    coverage_start_date: payment.coverage_start_date,
    coverage_end_date: payment.coverage_end_date,
    fee_month: payment.fee_month,
    fee_year: payment.fee_year,
    payment_method: payment.payment_method,
    transaction_id: payment.transaction_id,
  };
}

async function insertCommunicationLog(input: {
  studentId: number;
  paymentId: number | null;
  branchId: number;
  communicationType: 'fee_reminder' | 'payment_receipt';
  reminderStage: PaymentReminderStage | null;
  channel: 'sms' | 'whatsapp';
  deliveryStatus: 'logged' | 'sent' | 'failed';
  deliveryMode: 'log_only' | 'webhook' | 'provider';
  providerName: string | null;
  externalMessageId: string | null;
  recipientPhone: string;
  recipientEmail: string | null;
  subject: string | null;
  messageBody: string;
  receiptSnapshot: ReceiptData | null;
  sentBy: number | null;
}): Promise<PaymentCommunication> {
  const result = await pool.query<PaymentCommunicationRow>(
    `
      INSERT INTO payment_communications (
        student_id,
        payment_id,
        branch_id,
        communication_type,
        reminder_stage,
        channel,
        delivery_status,
        delivery_mode,
        provider_name,
        external_message_id,
        recipient_phone,
        recipient_email,
        subject,
        message_body,
        receipt_snapshot,
        sent_by,
        sent_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        NOW()
      )
      RETURNING
        id,
        student_id,
        payment_id,
        branch_id,
        communication_type,
        reminder_stage,
        channel,
        delivery_status,
        delivery_mode,
        provider_name,
        external_message_id,
        recipient_phone,
        recipient_email,
        subject,
        message_body,
        receipt_snapshot,
        sent_by,
        sent_at,
        created_at,
        updated_at
    `,
    [
      input.studentId,
      input.paymentId,
      input.branchId,
      input.communicationType,
      input.reminderStage,
      input.channel,
      input.deliveryStatus,
      input.deliveryMode,
      input.providerName,
      input.externalMessageId,
      input.recipientPhone,
      input.recipientEmail,
      input.subject,
      input.messageBody,
      input.receiptSnapshot ? JSON.stringify(input.receiptSnapshot) : null,
      input.sentBy,
    ],
  );

  const communication = result.rows[0];

  if (!communication) {
    throw new Error('Communication log entry was not returned after creation');
  }

  return {
    ...communication,
    student_name: '',
    student_code: '',
    receipt_number: input.receiptSnapshot?.receipt_number ?? null,
  };
}

// Record a new payment
export async function recordPayment(
  data: RecordPaymentDTO,
  collectedBy: number,
  branchId?: number,
): Promise<Payment> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const studentRow = await getActiveStudentPaymentRecord(client, data.student_id, branchId);

    const expectedFee = Number.parseFloat(String(studentRow.monthly_fee));

    if (Number.parseFloat(data.amount.toString()) !== expectedFee) {
      throw new Error(
        `Amount mismatch. Expected: Rs.${expectedFee}, Received: Rs.${data.amount}`,
      );
    }

    const providedDate = data.payment_date?.trim() ? parseDateOnly(data.payment_date.trim()) : null;
    const todayDate = providedDate ?? parseDateOnly(new Date().toISOString().slice(0, 10));

    const existingPendingResult = await client.query<{ id: number }>(
      `
        SELECT
          id
        FROM fee_payments
        WHERE student_id = $1
          AND status = 'pending'
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [data.student_id],
    );

    if (existingPendingResult.rows.length > 0) {
      throw new Error('Payment is already pending verification for this student');
    }

    const latestPaidCoverage = await getLatestPaidCoverage(client, data.student_id);

    if (latestPaidCoverage.paymentDate?.getTime() === todayDate.getTime()) {
      throw new Error('Payment already submitted today for this student');
    }

    const { coverageStartDate, coverageEndDate } = calculateCoverageWindow(
      todayDate,
      latestPaidCoverage.coverageEndDate,
    );

    const insertQuery = `
      INSERT INTO fee_payments (
        student_id,
        payment_date,
        coverage_start_date,
        coverage_end_date,
        amount,
        fee_month,
        fee_year,
        payment_method,
        transaction_id,
        status,
        gateway_provider,
        gateway_mode,
        gateway_session_id,
        gateway_cf_order_id,
        gateway_checkout_url,
        gateway_upi_intent,
        gateway_order_status,
        gateway_expires_at,
        verification_source,
        verification_reference,
        verified_at,
        verified_by,
        collected_by,
        notes
      ) VALUES (
        $1,
        '${formatDateOnly(todayDate)}',
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'pending',
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        'manual_entry',
        NULL,
        NULL,
        NULL,
        $17,
        $18
      )
      RETURNING *;
    `;

    const result = await client.query<Payment>(insertQuery, [
      data.student_id,
      formatDateOnly(coverageStartDate),
      formatDateOnly(coverageEndDate),
      data.amount,
      data.fee_month ?? coverageEndDate.getUTCMonth() + 1,
      data.fee_year ?? coverageEndDate.getUTCFullYear(),
      data.payment_method || 'upi',
      data.transaction_id || null,
      data.gateway_provider ?? null,
      data.gateway_mode ?? null,
      data.gateway_session_id ?? null,
      data.gateway_cf_order_id ?? null,
      data.gateway_checkout_url ?? null,
      data.gateway_upi_intent ?? null,
      data.gateway_order_status ?? null,
      data.gateway_expires_at ?? null,
      collectedBy,
      data.notes || null,
    ]);

    const createdPayment = result.rows[0];

    if (!createdPayment) {
      throw new Error('Payment record was not returned after creation');
    }

    if (shouldNotifyOnPaymentSubmission(data)) {
      await notificationsService.createPaymentSubmittedNotification(client, {
        paymentId: createdPayment.id,
        studentId: createdPayment.student_id,
        studentName: studentRow.name,
        branchId: studentRow.branch_id,
        branchName: studentRow.branch_name,
        amount: createdPayment.amount,
        receiptNumber: createdPayment.receipt_number,
      });
    }

    await client.query('COMMIT');

    emitPaymentActivity({
      paymentId: createdPayment.id,
      studentId: createdPayment.student_id,
      branchId: studentRow.branch_id,
      status: createdPayment.status,
    });

    return createdPayment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelPayment(
  paymentId: number,
  cancelledBy: number,
  branchId?: number,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lockResult = await client.query<{ id: number; status: string; student_id: number }>(
      `SELECT id, status, student_id FROM fee_payments WHERE id = $1
       ${branchId != null ? ' AND (SELECT branch_id FROM students WHERE id = fee_payments.student_id) = $2' : ''}
       FOR UPDATE`,
      branchId != null ? [paymentId, branchId] : [paymentId],
    );

    const payment = lockResult.rows[0];

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'pending') {
      throw new Error('Only pending payments can be cancelled');
    }

    await client.query(
      `UPDATE fee_payments SET status = 'failed', verification_source = NULL, verified_by = $1, verified_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [cancelledBy, paymentId],
    );

    const ioServer = (globalThis as any).io;

    if (ioServer && typeof ioServer.to === 'function') {
      ioServer.to('role:superadmin').emit('payment_activity', {
        paymentId,
        studentId: payment.student_id,
        status: 'cancelled',
      });
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createCashfreePaymentRequest(
  data: CreateCashfreePaymentRequestDTO,
  requestedBy: number,
  branchId?: number,
): Promise<CashfreePaymentRequestResult> {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const student = await getActiveStudentPaymentRecord(client, data.student_id, branchId);
    const existingPendingResult = await client.query<{ id: number }>(
      `
        SELECT id
        FROM fee_payments
        WHERE student_id = $1
          AND status = 'pending'
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [data.student_id],
    );

    if (existingPendingResult.rows.length > 0) {
      await client.query(
        `UPDATE fee_payments SET status = 'failed', verification_source = NULL, verified_by = $1, verified_at = CURRENT_TIMESTAMP WHERE student_id = $2 AND status = 'pending'`,
        [requestedBy, data.student_id],
      );
    }

    await client.query('COMMIT');
    transactionOpen = false;

    const amount = Number.parseFloat(String(student.monthly_fee));
    const orderId = generateCashfreeOrderId(student.id);
    const session = await createCashfreePaymentSession({
      orderId,
      amount,
      customerId: student.student_code,
      customerName: student.name,
      customerEmail: student.email,
      customerPhone: student.phone,
      note: `Library fee for ${student.name}`,
    });

    const payment = await recordPayment(
      {
        student_id: data.student_id,
        amount,
        payment_method: 'upi',
        transaction_id: session.order_id,
        notes: `Cashfree ${session.mode} request created`,
        gateway_provider: session.provider,
        gateway_mode: session.mode,
        gateway_session_id: session.payment_session_id,
        gateway_cf_order_id: session.cf_order_id,
        gateway_checkout_url: session.checkout_url,
        gateway_upi_intent: session.upi_intent,
        gateway_order_status: session.order_status,
        gateway_expires_at: session.expires_at,
      },
      requestedBy,
      branchId,
    );
    const publicAccessToken = generatePublicPaymentAccessToken(payment.id);

    return {
      payment,
      session,
      public_payment_url: buildPublicPaymentUrl(publicAccessToken),
      public_access_expires_at: getPublicPaymentAccessExpiry(publicAccessToken),
    };
  } catch (error) {
    if (transactionOpen) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client.release();
  }
}

async function confirmPendingPayment(input: {
  paymentId: number;
  verificationSource: PaymentVerificationSource;
  verificationReference?: string;
  confirmedAt?: string;
  amount?: number;
  verifiedBy?: number | null;
  branchId?: number;
}): Promise<Payment> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const paymentRecord = await getLockedPaymentRecord(
      client,
      input.paymentId,
      input.branchId,
    );

    if (!paymentRecord) {
      throw new Error('Payment not found');
    }

    if (paymentRecord.status === 'failed' || paymentRecord.status === 'refunded') {
      throw new Error('Only pending payments can be confirmed');
    }

    if (paymentRecord.status === 'paid') {
      await client.query('COMMIT');
      return paymentRecord;
    }

    const expectedAmount = Number.parseFloat(String(paymentRecord.amount));

    if (
      input.amount != null &&
      Math.abs(Number.parseFloat(String(input.amount)) - expectedAmount) > 0.001
    ) {
      throw new Error(
        `Amount mismatch. Expected: Rs.${paymentRecord.amount}, Received: Rs.${input.amount}`,
      );
    }

    const confirmedAt = normalizeConfirmedAt(input.confirmedAt);
    const confirmedDate = parseDateOnly(formatDateOnly(confirmedAt));
    const latestPaidCoverage = await getLatestPaidCoverage(
      client,
      paymentRecord.student_id,
      paymentRecord.id,
    );
    const { coverageStartDate, coverageEndDate } = calculateCoverageWindow(
      confirmedDate,
      latestPaidCoverage.coverageEndDate,
    );
    const confirmedPaymentDate = formatDateOnly(confirmedAt);
    const verificationReference =
      input.verificationReference?.trim() ||
      paymentRecord.transaction_id ||
      paymentRecord.verification_reference ||
      null;

    const updateResult = await client.query<Payment>(
      `
        UPDATE fee_payments
        SET
          payment_date = $2,
          coverage_start_date = $3,
          coverage_end_date = $4,
          status = 'paid',
          verification_source = $5,
          verification_reference = $6,
          verified_at = $7,
          verified_by = $8,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        paymentRecord.id,
        confirmedPaymentDate,
        formatDateOnly(coverageStartDate),
        formatDateOnly(coverageEndDate),
        input.verificationSource,
        verificationReference,
        confirmedAt,
        input.verifiedBy ?? null,
      ],
    );

    const confirmedPayment = updateResult.rows[0];

    if (!confirmedPayment) {
      throw new Error('Payment record was not returned after confirmation');
    }

    if (shouldNotifyOnPaymentConfirmation(paymentRecord)) {
      await notificationsService.createPaymentReceivedNotification(client, {
        paymentId: confirmedPayment.id,
        studentId: confirmedPayment.student_id,
        studentName: paymentRecord.student_name,
        branchId: paymentRecord.branch_id,
        branchName: paymentRecord.branch_name,
        amount: confirmedPayment.amount,
        receiptNumber: confirmedPayment.receipt_number,
      });
    }

    await client.query('COMMIT');

    emitPaymentActivity({
      paymentId: confirmedPayment.id,
      studentId: confirmedPayment.student_id,
      branchId: paymentRecord.branch_id,
      status: confirmedPayment.status,
    });

    try {
      await sendPaymentReceipt(
        confirmedPayment.id,
        input.verifiedBy ?? null,
        input.branchId,
        'both',
      );
    } catch (communicationError) {
      console.error('Automatic payment receipt logging failed:', communicationError);
    }

    return confirmedPayment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmPayment(
  paymentId: number,
  verifiedBy: number,
  branchId?: number,
  data: ConfirmPaymentDTO = {},
): Promise<Payment> {
  return confirmPendingPayment({
    paymentId,
    verificationSource: 'superadmin_review',
    verifiedBy,
    ...(data.verification_reference
      ? { verificationReference: data.verification_reference }
      : {}),
    ...(data.confirmed_at ? { confirmedAt: data.confirmed_at } : {}),
    ...(data.amount != null ? { amount: data.amount } : {}),
    ...(branchId != null ? { branchId } : {}),
  });
}

export async function simulateCashfreePaymentSuccess(
  paymentId: number,
  triggeredBy: number,
  branchId?: number,
): Promise<Payment> {
  const payment = await getPaymentWithDetailsById(paymentId, branchId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (!payment.transaction_id) {
    throw new Error('Cashfree order reference is missing for this payment');
  }

  if (payment.status === 'paid') {
    return payment;
  }

  const mockWebhook = buildMockCashfreeWebhookPayload({
    orderId: payment.transaction_id,
    amount: payment.amount,
    cfPaymentId: `mock_cf_success_${payment.id}_${triggeredBy}`,
  });

  const webhookConfirmation: ConfirmPaymentWebhookDTO = {
    transaction_id: payment.transaction_id,
    amount: payment.amount,
    ...(mockWebhook.payload.data?.payment?.cf_payment_id
      ? {
          verification_reference: mockWebhook.payload.data.payment.cf_payment_id,
        }
      : {}),
    ...(mockWebhook.payload.data?.payment?.payment_time
      ? {
          confirmed_at: mockWebhook.payload.data.payment.payment_time,
        }
      : {}),
  };

  return confirmPaymentFromWebhook(webhookConfirmation);
}

export async function confirmPaymentFromWebhook(
  data: ConfirmPaymentWebhookDTO,
): Promise<Payment> {
  const paymentId = data.payment_id;
  const transactionId = data.transaction_id?.trim();

  if (paymentId == null && !transactionId) {
    throw new Error('payment_id or transaction_id is required');
  }

  let resolvedPaymentId = paymentId;

  if (resolvedPaymentId == null && transactionId) {
    const lookupResult = await pool.query<{ id: number }>(
      `
        SELECT id
        FROM fee_payments
        WHERE transaction_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [transactionId],
    );

    resolvedPaymentId = lookupResult.rows[0]?.id;
  }

  if (resolvedPaymentId == null) {
    throw new Error('Payment not found');
  }

  const webhookReference = data.verification_reference ?? transactionId;

  return confirmPendingPayment({
    paymentId: resolvedPaymentId,
    verificationSource: 'gateway_webhook',
    verifiedBy: null,
    ...(webhookReference ? { verificationReference: webhookReference } : {}),
    ...(data.confirmed_at ? { confirmedAt: data.confirmed_at } : {}),
    ...(data.amount != null ? { amount: data.amount } : {}),
  });
}

// Get student's payment history
export async function getStudentPaymentHistory(
  studentId: number,
  limit: number = 12,
  branchId?: number,
): Promise<Payment[]> {
  const params: number[] = [studentId];
  let query = `
    SELECT p.*
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.student_id = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  query += ` ORDER BY p.payment_date DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query<Payment>(query, params);
  return result.rows;
}

// Get all payments with student details
export async function getAllPayments(
  options: PaymentHistoryQueryOptions = {},
): Promise<PaymentHistoryPage> {
  const page = Math.max(options.page ?? 1, 1);
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const offset = (page - 1) * limit;
  const { fromClause, params } = buildPaymentHistoryFromClause(options);

  const countQuery = `
    SELECT COUNT(*)::int AS total
    ${fromClause}
  `;
  const countResult = await pool.query<{ total: number }>(countQuery, params);
  const total = countResult.rows[0]?.total ?? 0;

  const query = `
    SELECT
      ${PAYMENT_HISTORY_SELECT_FIELDS}
    ${fromClause}
    ORDER BY p.payment_date DESC, p.created_at DESC, p.id DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const result = await pool.query<PaymentWithStudent>(query, [...params, limit, offset]);

  return {
    payments: result.rows,
    total,
    page,
    limit,
    totalPages: total === 0 ? 1 : Math.ceil(total / limit),
  };
}

// Auto-expire pending payments with expired gateway sessions
async function autoExpirePendingPayments(): Promise<void> {
  await pool.query(`
    UPDATE fee_payments
    SET status = 'failed'
    WHERE status = 'pending'
      AND gateway_expires_at IS NOT NULL
      AND gateway_expires_at < NOW()
  `);
}

// Get pending payments
export async function getPendingPayments(branchId?: number): Promise<PendingPayment[]> {
  await autoExpirePendingPayments();
  const statuses = await getStudentPaymentSnapshots(branchId);

  return statuses
    .filter((status) => status.due_status !== 'current')
    .sort((left, right) => {
      if (left.days_until_due !== right.days_until_due) {
        return left.days_until_due - right.days_until_due;
      }

      return left.student_name.localeCompare(right.student_name);
    });
}

export async function getPaymentAlertSummary(branchId?: number): Promise<PaymentAlertSummary> {
  const statuses = await getStudentPaymentSnapshots(branchId);
  return buildPaymentAlertSummary(statuses);
}

export async function getPaymentCommunicationHistory(
  options: PaymentCommunicationQueryOptions = {},
  branchId?: number,
): Promise<PaymentCommunication[]> {
  const params: Array<number | string> = [];
  let query = `
    SELECT
      c.id,
      c.student_id,
      c.payment_id,
      c.branch_id,
      c.communication_type,
      c.reminder_stage,
      c.channel,
      c.delivery_status,
      c.delivery_mode,
      c.provider_name,
      c.external_message_id,
      c.recipient_phone,
      c.recipient_email,
      c.subject,
      c.message_body,
      c.receipt_snapshot,
      c.sent_by,
      c.sent_at,
      c.created_at,
      c.updated_at,
      s.name AS student_name,
      s.student_id AS student_code,
      p.receipt_number
    FROM payment_communications c
    JOIN students s ON s.id = c.student_id
    LEFT JOIN fee_payments p ON p.id = c.payment_id
    WHERE 1 = 1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND c.branch_id = $${params.length}`;
  }

  if (options.student_id != null) {
    params.push(options.student_id);
    query += ` AND c.student_id = $${params.length}`;
  }

  if (options.payment_id != null) {
    params.push(options.payment_id);
    query += ` AND c.payment_id = $${params.length}`;
  }

  const limit = Math.min(options.limit ?? 50, 200);
  params.push(limit);
  query += ` ORDER BY c.sent_at DESC, c.id DESC LIMIT $${params.length}`;

  const result = await pool.query<PaymentCommunicationRow>(query, params);
  return result.rows;
}

export async function sendPaymentReminder(
  studentId: number,
  sentBy: number,
  branchId?: number,
  requestedChannel: PaymentCommunicationRequestChannel = 'both',
): Promise<PaymentCommunication[]> {
  const pendingPayment = (await getStudentPaymentSnapshots(branchId)).find(
    (item) => item.student_id === studentId,
  );

  if (!pendingPayment) {
    throw new Error('Student not found or not accessible');
  }

  const reminder = buildReminderMessage(pendingPayment);
  const channels = resolveRequestedChannels(requestedChannel);
  const eligibleChannels: Array<'sms' | 'whatsapp'> = [];

  for (const channel of channels) {
    const alreadySent = await hasReminderBeenSentToday(
      pendingPayment.student_id,
      reminder.stage,
      channel,
    );

    if (!alreadySent) {
      eligibleChannels.push(channel);
    }
  }

  if (eligibleChannels.length === 0) {
    throw new Error('Reminder already sent today for the selected channels');
  }

  const communications: PaymentCommunication[] = [];

  for (const channel of eligibleChannels) {
    const dispatchResult = await dispatchPaymentCommunication({
      channel,
      recipientPhone: pendingPayment.student_phone,
      recipientEmail: pendingPayment.student_email,
      subject: reminder.subject,
      messageBody: reminder.messageBody,
      metadata: {
        communication_type: 'fee_reminder',
        reminder_stage: reminder.stage,
        student_id: pendingPayment.student_id,
        student_code: pendingPayment.student_code,
        next_due_date: formatDateOnly(pendingPayment.next_due_date),
      },
    });

    const communication = await insertCommunicationLog({
      studentId: pendingPayment.student_id,
      paymentId: null,
      branchId: pendingPayment.branch_id,
      communicationType: 'fee_reminder',
      reminderStage: reminder.stage,
      channel,
      deliveryStatus: dispatchResult.deliveryStatus,
      deliveryMode: dispatchResult.deliveryMode,
      providerName: dispatchResult.providerName,
      externalMessageId: dispatchResult.externalMessageId,
      recipientPhone: pendingPayment.student_phone,
      recipientEmail: pendingPayment.student_email,
      subject: reminder.subject,
      messageBody: reminder.messageBody,
      receiptSnapshot: null,
      sentBy,
    });

    communications.push({
      ...communication,
      student_name: pendingPayment.student_name,
      student_code: pendingPayment.student_code,
      receipt_number: null,
    });
  }

  return communications;
}

export async function runReminderBatch(
  sentBy: number,
  branchId?: number,
  requestedChannel: PaymentCommunicationRequestChannel = 'both',
): Promise<PaymentReminderBatchResult> {
  const watchlist = (await getStudentPaymentSnapshots(branchId)).filter(
    (item) => item.recommended_reminder_stage != null,
  );

  const channels = resolveRequestedChannels(requestedChannel);
  const communications: PaymentCommunication[] = [];
  let skipped = 0;

  for (const pendingPayment of watchlist) {
    const reminder = buildReminderMessage(pendingPayment);
    const eligibleChannels: Array<'sms' | 'whatsapp'> = [];

    for (const channel of channels) {
      const alreadySent = await hasReminderBeenSentToday(
        pendingPayment.student_id,
        reminder.stage,
        channel,
      );

      if (alreadySent) {
        skipped += 1;
        continue;
      }

      eligibleChannels.push(channel);
    }

    for (const channel of eligibleChannels) {
      const dispatchResult = await dispatchPaymentCommunication({
        channel,
        recipientPhone: pendingPayment.student_phone,
        recipientEmail: pendingPayment.student_email,
        subject: reminder.subject,
        messageBody: reminder.messageBody,
        metadata: {
          communication_type: 'fee_reminder',
          reminder_stage: reminder.stage,
          student_id: pendingPayment.student_id,
          student_code: pendingPayment.student_code,
          next_due_date: formatDateOnly(pendingPayment.next_due_date),
        },
      });

      const communication = await insertCommunicationLog({
        studentId: pendingPayment.student_id,
        paymentId: null,
        branchId: pendingPayment.branch_id,
        communicationType: 'fee_reminder',
        reminderStage: reminder.stage,
        channel,
        deliveryStatus: dispatchResult.deliveryStatus,
        deliveryMode: dispatchResult.deliveryMode,
        providerName: dispatchResult.providerName,
        externalMessageId: dispatchResult.externalMessageId,
        recipientPhone: pendingPayment.student_phone,
        recipientEmail: pendingPayment.student_email,
        subject: reminder.subject,
        messageBody: reminder.messageBody,
        receiptSnapshot: null,
        sentBy,
      });

      communications.push({
        ...communication,
        student_name: pendingPayment.student_name,
        student_code: pendingPayment.student_code,
        receipt_number: null,
      });
    }
  }

  return {
    attempted: watchlist.length,
    sent: communications.length,
    skipped,
    communications,
  };
}

export async function sendPaymentReceipt(
  paymentId: number,
  sentBy: number | null,
  branchId?: number,
  requestedChannel: PaymentCommunicationRequestChannel = 'both',
): Promise<PaymentCommunication[]> {
  const payment = await getPaymentWithDetailsById(paymentId, branchId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'paid') {
    throw new Error('Receipt is available only after payment verification');
  }

  const receiptSnapshot = toReceiptSnapshot(payment);
  const receipt = buildReceiptMessage(receiptSnapshot);
  const channels = resolveRequestedChannels(requestedChannel);
  const communications: PaymentCommunication[] = [];
  const paymentBranchId = payment.branch_id;

  if (paymentBranchId == null) {
    throw new Error('Payment branch details are missing');
  }

  for (const channel of channels) {
    const dispatchResult = await dispatchPaymentCommunication({
      channel,
      recipientPhone: payment.student_phone,
      recipientEmail: payment.student_email,
      subject: receipt.subject,
      messageBody: receipt.messageBody,
      metadata: {
        communication_type: 'payment_receipt',
        payment_id: payment.id,
        receipt_number: payment.receipt_number,
        student_id: payment.student_id,
        student_code: payment.student_code,
      },
    });

    const communication = await insertCommunicationLog({
      studentId: payment.student_id,
      paymentId: payment.id,
      branchId: paymentBranchId,
      communicationType: 'payment_receipt',
      reminderStage: null,
      channel,
      deliveryStatus: dispatchResult.deliveryStatus,
      deliveryMode: dispatchResult.deliveryMode,
      providerName: dispatchResult.providerName,
      externalMessageId: dispatchResult.externalMessageId,
      recipientPhone: payment.student_phone,
      recipientEmail: payment.student_email,
      subject: receipt.subject,
      messageBody: receipt.messageBody,
      receiptSnapshot,
      sentBy,
    });

    communications.push({
      ...communication,
      student_name: payment.student_name,
      student_code: payment.student_code,
      receipt_number: payment.receipt_number,
    });
  }

  return communications;
}

export async function exportMonthlyPaymentHistoryPdf(
  month: number,
  year: number,
  branchId?: number,
): Promise<{ buffer: Buffer; filename: string }> {
  const { fromClause, params } = buildPaymentHistoryFromClause({
    month,
    year,
    ...(branchId != null ? { branchId } : {}),
  });

  const result = await pool.query<PaymentWithStudent>(
    `
      SELECT
        ${PAYMENT_HISTORY_SELECT_FIELDS}
      ${fromClause}
      ORDER BY p.payment_date DESC, p.created_at DESC, p.id DESC
    `,
    params,
  );

  const payments = result.rows;
  const scopeLabel = await getPaymentHistoryScopeLabel(branchId);
  const summary = payments.reduce<PaymentHistoryReportSummary>(
    (accumulator, payment) => {
      accumulator.total_records += 1;
      accumulator.total_amount += payment.amount;

      if (payment.status === 'paid') {
        accumulator.paid_count += 1;
        accumulator.paid_amount += payment.amount;
      } else if (payment.status === 'pending') {
        accumulator.pending_count += 1;
      } else if (payment.status === 'failed') {
        accumulator.failed_count += 1;
      } else if (payment.status === 'refunded') {
        accumulator.refunded_count += 1;
      }

      return accumulator;
    },
    {
      total_records: 0,
      total_amount: 0,
      paid_amount: 0,
      paid_count: 0,
      pending_count: 0,
      failed_count: 0,
      refunded_count: 0,
    },
  );

  const report: MonthlyPaymentHistoryReport = {
    month,
    year,
    scope_label: scopeLabel,
    generated_at: new Date(),
    payments,
    summary,
  };

  const safeScope = scopeLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = `payment-history-${year}-${String(month).padStart(2, '0')}-${safeScope || 'report'}.pdf`;

  return {
    buffer: buildMonthlyPaymentHistoryPdf(report),
    filename,
  };
}

// Get monthly revenue report
export async function getMonthlyRevenue(
  month: number,
  year: number,
  branchId?: number,
): Promise<MonthlyRevenue> {
  const revenueParams: number[] = [month, year];
  let revenueQuery = `
    SELECT
      COUNT(*) as total_payments,
      COALESCE(SUM(p.amount), 0) as total_amount
    FROM fee_payments p
  `;

  if (branchId != null) {
    revenueParams.push(branchId);
    revenueQuery += `
      JOIN students s ON p.student_id = s.id
      WHERE EXTRACT(MONTH FROM p.payment_date) = $1
        AND EXTRACT(YEAR FROM p.payment_date) = $2
        AND p.status = 'paid'
        AND s.branch_id = $3
    `;
  } else {
    revenueQuery += `
      WHERE EXTRACT(MONTH FROM p.payment_date) = $1
        AND EXTRACT(YEAR FROM p.payment_date) = $2
        AND p.status = 'paid'
    `;
  }

  const revenueResult = await pool.query(revenueQuery, revenueParams);

  const branchParams: number[] = [month, year];
  let branchQuery = `
    SELECT
      s.branch_id,
      b.name as branch_name,
      COALESCE(SUM(p.amount), 0) as total_amount,
      COUNT(p.id) as payment_count
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON s.branch_id = b.id
    WHERE EXTRACT(MONTH FROM p.payment_date) = $1
      AND EXTRACT(YEAR FROM p.payment_date) = $2
      AND p.status = 'paid'
  `;

  if (branchId != null) {
    branchParams.push(branchId);
    branchQuery += ` AND s.branch_id = $${branchParams.length}`;
  }

  branchQuery += `
    GROUP BY s.branch_id, b.name
    ORDER BY total_amount DESC
  `;

  const branchResult = await pool.query(branchQuery, branchParams);

  return {
    month,
    year,
    total_payments: Number.parseInt(revenueResult.rows[0].total_payments, 10),
    total_amount: Number.parseFloat(revenueResult.rows[0].total_amount),
    branch_wise: branchResult.rows,
  };
}

// Get payment by receipt number
export async function getPaymentByReceiptNumber(
  receiptNumber: string,
  branchId?: number,
): Promise<PaymentWithStudent | null> {
  const params: Array<string | number> = [receiptNumber];
  let query = `
    SELECT
      p.id,
      p.payment_date,
      p.coverage_start_date,
      p.coverage_end_date,
      p.amount,
      p.fee_month,
      p.fee_year,
      p.payment_method,
      p.transaction_id,
      p.status,
      p.gateway_provider,
      p.gateway_mode,
      p.gateway_session_id,
      p.gateway_cf_order_id,
      p.gateway_checkout_url,
      p.gateway_upi_intent,
      p.gateway_order_status,
      p.gateway_expires_at,
      p.collected_by,
      p.receipt_number,
      p.verification_source,
      p.verification_reference,
      p.verified_at,
      p.verified_by,
      p.notes,
      p.created_at,
      p.updated_at,
      p.student_id,
      s.name as student_name,
      s.student_id as student_code,
      s.email as student_email,
      s.phone as student_phone,
      s.branch_id,
      b.name as branch_name
    FROM fee_payments p
    JOIN students s ON p.student_id = s.id
    JOIN branches b ON s.branch_id = b.id
    WHERE p.receipt_number = $1
  `;

  if (branchId != null) {
    params.push(branchId);
    query += ` AND s.branch_id = $${params.length}`;
  }

  const result = await pool.query<PaymentWithStudent>(query, params);
  return result.rows[0] ?? null;
}

export async function getPublicPaymentByAccessToken(
  accessToken: string,
): Promise<PublicPaymentDetails | null> {
  const paymentId = resolvePublicPaymentIdFromAccessToken(accessToken);

  if (paymentId == null) {
    return null;
  }

  const result = await pool.query<PublicPaymentDetails>(
    `
      SELECT
        p.id,
        s.name AS student_name,
        b.name AS branch_name,
        p.amount,
        p.status,
        p.receipt_number,
        p.gateway_mode,
        p.gateway_session_id,
        p.gateway_upi_intent,
        p.gateway_checkout_url,
        p.gateway_expires_at
      FROM fee_payments p
      JOIN students s ON s.id = p.student_id
      JOIN branches b ON b.id = s.branch_id
      WHERE p.id = $1
        AND p.status IN ('pending', 'paid')
      LIMIT 1
    `,
    [paymentId],
  );

  return result.rows[0] ?? null;
}
