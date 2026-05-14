import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  CalendarClock,
  CircleAlert,
  Copy,
  Download,
  DollarSign,
  ExternalLink,
  Loader2,
  Plus,
  Receipt,
  RefreshCcw,
  ScanLine,
  Search,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge, Button, Card, Input } from '@/components/ui';
import { getBranchName } from '@/config/branches';
import { getStoredUser } from '@/lib/auth/session';
import { paymentsApi, studentsApi } from '@/lib/api';
import { openCashfreeCheckout } from '@/lib/payments/cashfree';
import type {
  CashfreePaymentRequestResult,
  MonthlyRevenue,
  PaymentCommunication,
  Payment,
  PendingPayment,
  Student,
} from '@/types';

function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

function formatDate(value: string | Date | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | Date | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function getCashfreeScanValue(
  session: CashfreePaymentRequestResult['session'] | null | undefined,
): string | null {
  if (!session) {
    return null;
  }

  return session.upi_intent || session.checkout_url || null;
}

function getSavedCashfreeSession(
  payment: Payment | null | undefined,
): CashfreePaymentRequestResult['session'] | null {
  if (
    !payment ||
    payment.gateway_provider !== 'cashfree' ||
    !payment.transaction_id ||
    !payment.gateway_session_id
  ) {
    return null;
  }

  return {
    provider: payment.gateway_provider,
    mode: payment.gateway_mode ?? 'mock',
    order_id: payment.transaction_id,
    cf_order_id: payment.gateway_cf_order_id ?? null,
    payment_session_id: payment.gateway_session_id,
    checkout_url: payment.gateway_checkout_url ?? null,
    upi_intent: payment.gateway_upi_intent ?? null,
    expires_at: payment.gateway_expires_at ?? null,
    order_status:
      payment.gateway_order_status ?? (payment.status === 'paid' ? 'PAID' : 'ACTIVE'),
    note:
      payment.notes ??
      'Reopened from a pending Cashfree request saved earlier for this student.',
  };
}

function addDays(baseDate: Date, days: number): Date {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getRenewalVariant(status: PendingPayment['due_status']): 'danger' | 'warning' | 'info' | 'success' {
  if (status === 'overdue') return 'danger';
  if (status === 'due_today') return 'warning';
  if (status === 'due_soon') return 'info';
  return 'success';
}

function getRenewalLabel(status: PendingPayment['due_status']) {
  if (status === 'overdue') return 'Overdue';
  if (status === 'due_today') return 'Due Today';
  if (status === 'due_soon') return 'Due Soon';
  return 'Current';
}

function getReminderStageLabel(stage: PendingPayment['recommended_reminder_stage']) {
  if (stage === 'before_3_days') return '3 Days Before Due';
  if (stage === 'due_today') return 'Due Today';
  if (stage === 'overdue') return 'Overdue';
  return 'Not Ready';
}

function getReminderStageVariant(
  stage: PendingPayment['recommended_reminder_stage'],
): 'danger' | 'warning' | 'info' | 'default' {
  if (stage === 'overdue') return 'danger';
  if (stage === 'due_today') return 'warning';
  if (stage === 'before_3_days') return 'info';
  return 'default';
}

function getCommunicationStatusVariant(
  status: PaymentCommunication['delivery_status'],
): 'success' | 'danger' | 'info' {
  if (status === 'sent') return 'success';
  if (status === 'failed') return 'danger';
  return 'info';
}

function getCommunicationStatusLabel(communication: PaymentCommunication) {
  if (communication.delivery_status === 'logged' && communication.delivery_mode === 'log_only') {
    return 'Logged';
  }

  if (communication.delivery_status === 'sent') {
    return 'Sent';
  }

  if (communication.delivery_status === 'failed') {
    return 'Failed';
  }

  return communication.delivery_status;
}

function getCommunicationTypeLabel(communication: PaymentCommunication) {
  if (communication.communication_type === 'payment_receipt') {
    return 'Receipt';
  }

  if (communication.reminder_stage === 'before_3_days') {
    return '3-Day Reminder';
  }

  if (communication.reminder_stage === 'due_today') {
    return 'Due Today Reminder';
  }

  if (communication.reminder_stage === 'overdue') {
    return 'Overdue Reminder';
  }

  return 'Fee Reminder';
}

function getPaymentStatusVariant(
  status: Payment['status'],
): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'danger';
  return 'default';
}

function getPaymentStatusLabel(status: Payment['status']): string {
  if (status === 'pending') {
    return 'Pending Verification';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface PaymentsPageLocationState {
  historySearchQuery?: string;
  historyMonthFilter?: number;
  historyYearFilter?: number;
}

interface PaymentFormState {
  student_id: number | null;
  amount: number;
  payment_method: 'upi';
  transaction_id: string;
  notes: string;
}

export default function PaymentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const branchLabel = isSuperAdmin
    ? 'All Branches'
    : getBranchName(currentUser?.branch_id ?? null);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const historyPageSize = 25;

  const [students, setStudents] = useState<Student[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [currentMonthPayments, setCurrentMonthPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [communicationHistory, setCommunicationHistory] = useState<PaymentCommunication[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue | null>(null);
  const [selectedStudentPayments, setSelectedStudentPayments] = useState<Payment[]>([]);
  const [selectedStudentPaymentsLoading, setSelectedStudentPaymentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentActionKey, setPaymentActionKey] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [cashfreeRequest, setCashfreeRequest] = useState<CashfreePaymentRequestResult | null>(null);
  const [communicationError, setCommunicationError] = useState<string | null>(null);
  const [communicationSuccess, setCommunicationSuccess] = useState<string | null>(null);
  const [communicationActionKey, setCommunicationActionKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [appliedHistorySearchQuery, setAppliedHistorySearchQuery] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState<number | 'all'>(currentMonth);
  const [historyYearFilter, setHistoryYearFilter] = useState<number | 'all'>(currentYear);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPayments, setHistoryTotalPayments] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyExporting, setHistoryExporting] = useState(false);
  const [historyExportError, setHistoryExportError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    student_id: null,
    amount: 0,
    payment_method: 'upi',
    transaction_id: '',
    notes: '',
  });

  const fetchPaymentsData = async (showLoader: boolean = true) => {
    if (showLoader) {
      setLoading(true);
    }

    setError(null);

    try {
      const [
        studentData,
        latestPayments,
        monthlyPayments,
        pendingData,
        communicationData,
        revenueData,
      ] =
        await Promise.all([
          studentsApi.getAll(),
          paymentsApi.getAll({
            ...(historyMonthFilter !== 'all' ? { month: historyMonthFilter } : {}),
            ...(historyYearFilter !== 'all' ? { year: historyYearFilter } : {}),
            ...(appliedHistorySearchQuery ? { search: appliedHistorySearchQuery } : {}),
            page: historyPage,
            limit: historyPageSize,
          }),
          paymentsApi.getAll({
            month: currentMonth,
            year: currentYear,
            page: 1,
            limit: 100,
          }),
          paymentsApi.getPending(),
          paymentsApi.getCommunications({ limit: 40 }),
          paymentsApi.getMonthlyRevenue(currentYear, currentMonth),
        ]);

      setStudents(studentData);
      setRecentPayments(latestPayments.data);
      setHistoryTotalPayments(latestPayments.total);
      setHistoryTotalPages(latestPayments.totalPages);
      setCurrentMonthPayments(monthlyPayments.data);
      setPendingPayments(pendingData);
      setCommunicationHistory(communicationData);
      setMonthlyRevenue(revenueData);
    } catch (err: any) {
      console.error('Failed to load payments page data.', err);
      setError(err.response?.data?.error || 'Failed to load payments data');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const refreshSelectedStudentPayments = async (studentId: number) => {
    const history = await paymentsApi.getStudentPayments(studentId);
    setSelectedStudentPayments(history);
  };

  useEffect(() => {
    void fetchPaymentsData();
  }, [appliedHistorySearchQuery, historyMonthFilter, historyPage, historyYearFilter]);

  useEffect(() => {
    const state = location.state as PaymentsPageLocationState | null;

    if (!state) {
      return;
    }

    const hasSearchState =
      state.historySearchQuery ||
      state.historyMonthFilter != null ||
      state.historyYearFilter != null;

    if (!hasSearchState) {
      return;
    }

    if (state.historyMonthFilter != null) {
      setHistoryMonthFilter(state.historyMonthFilter);
    }

    if (state.historyYearFilter != null) {
      setHistoryYearFilter(state.historyYearFilter);
    }

    if (state.historySearchQuery != null) {
      setHistorySearchQuery(state.historySearchQuery);
      setAppliedHistorySearchQuery(state.historySearchQuery.trim());
    }

    setHistoryPage(1);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHistoryPage(1);
      setAppliedHistorySearchQuery(historySearchQuery.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [historySearchQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadStudentPayments() {
      if (!paymentForm.student_id || paymentForm.student_id <= 0) {
  setSelectedStudentPayments([]);
  return;
}
      

      setSelectedStudentPaymentsLoading(true);

      try {
        const history = await paymentsApi.getStudentPayments(paymentForm.student_id);

        if (isMounted) {
          setSelectedStudentPayments(history);
        }
      } catch (err) {
        console.error('Failed to load selected student payment history.', err);

        if (isMounted) {
          setSelectedStudentPayments([]);
        }
      } finally {
        if (isMounted) {
          setSelectedStudentPaymentsLoading(false);
        }
      }
    }

    void loadStudentPayments();

    return () => {
      isMounted = false;
    };
  }, [paymentForm.student_id]);

  const activeStudents = useMemo(
    () =>
      students
        .filter((student) => student.is_active)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [students],
  );

  const selectedStudent = useMemo(
    () => activeStudents.find((student) => student.id === paymentForm.student_id) ?? null,
    [activeStudents, paymentForm.student_id],
  );

  const selectedRenewalStatus = useMemo(
    () => pendingPayments.find((student) => student.student_id === paymentForm.student_id) ?? null,
    [paymentForm.student_id, pendingPayments],
  );

  const selectedLatestPayment =
    selectedStudentPayments.find((payment) => payment.status === 'paid') ?? null;
  const selectedPendingPayment =
    selectedStudentPayments.find((payment) => payment.status === 'pending') ?? null;
  const selectedPendingCashfreePayment =
    selectedStudentPayments.find(
      (payment) =>
        payment.status === 'pending' && Boolean(payment.transaction_id?.startsWith('CFPAY-')),
    ) ?? null;
  const selectedPendingManualPayment =
    selectedPendingPayment && selectedPendingPayment.id !== selectedPendingCashfreePayment?.id
      ? selectedPendingPayment
      : null;
  const hasSelectedPendingPayment = Boolean(selectedPendingPayment);
  const activeCashfreeSession =
    cashfreeRequest?.session ?? getSavedCashfreeSession(selectedPendingCashfreePayment);
  const cashfreeScanValue = getCashfreeScanValue(activeCashfreeSession);
  const cashfreePublicPaymentUrl = cashfreeRequest?.public_payment_url ?? null;
  const cashfreeCheckoutUrl = activeCashfreeSession?.checkout_url ?? null;
  const cashfreeShareValue = cashfreePublicPaymentUrl || cashfreeCheckoutUrl || cashfreeScanValue;

  const renewalPreview = useMemo(() => {
    if (!selectedStudent) {
      return null;
    }

    const today = new Date();
    const latestCoverageEnd = selectedLatestPayment?.coverage_end_date
      ? new Date(selectedLatestPayment.coverage_end_date)
      : null;
    const coverageStart =
      latestCoverageEnd && latestCoverageEnd >= today
        ? addDays(latestCoverageEnd, 1)
        : today;
    const coverageEnd = addDays(coverageStart, 29);
    const nextDue = addDays(coverageEnd, 1);

    return {
      coverageStart,
      coverageEnd,
      nextDue,
    };
  }, [selectedLatestPayment, selectedStudent]);

  const todayCollection = useMemo(() => {
    const todayKey = currentDate.toISOString().slice(0, 10);
    const todayPayments = currentMonthPayments.filter(
      (payment) => payment.status === 'paid' && payment.payment_date.slice(0, 10) === todayKey,
    );

    return {
      count: todayPayments.length,
      amount: todayPayments.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [currentDate, currentMonthPayments]);

  const overdueAmount = useMemo(
    () =>
      pendingPayments
        .filter((payment) => payment.due_status === 'overdue')
        .reduce((sum, payment) => sum + payment.total_pending, 0),
    [pendingPayments],
  );

  const dueTodayCount = useMemo(
    () => pendingPayments.filter((payment) => payment.due_status === 'due_today').length,
    [pendingPayments],
  );

  const dueSoonCount = useMemo(
    () => pendingPayments.filter((payment) => payment.due_status === 'due_soon').length,
    [pendingPayments],
  );

  const filteredPendingPayments = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return pendingPayments;
    }

    return pendingPayments.filter(
      (payment) =>
        payment.student_name.toLowerCase().includes(normalizedQuery) ||
        payment.student_code.toLowerCase().includes(normalizedQuery) ||
        payment.student_phone.includes(searchQuery) ||
        payment.branch_name.toLowerCase().includes(normalizedQuery),
    );
  }, [pendingPayments, searchQuery]);

  const historyYearOptions = useMemo(() => {
    const startYear = 2020;
    const totalYears = Math.max(1, currentYear - startYear + 1);

    return Array.from({ length: totalYears }, (_, index) => currentYear - index);
  }, [currentYear]);

  const canExportMonthlyHistory =
    historyMonthFilter !== 'all' && historyYearFilter !== 'all';

  const selectedHistoryMonthLabel = useMemo(() => {
    if (!canExportMonthlyHistory) {
      return '';
    }

    return new Date(Number(historyYearFilter), Number(historyMonthFilter) - 1, 1).toLocaleString(
      'en-IN',
      { month: 'long' },
    );
  }, [canExportMonthlyHistory, historyMonthFilter, historyYearFilter]);

  const updatePaymentForm = <K extends keyof PaymentFormState>(
    field: K,
    value: PaymentFormState[K],
  ) => {
    setPaymentForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (paymentError) {
      setPaymentError(null);
    }

    if (paymentSuccess) {
      setPaymentSuccess(null);
    }
  };

  const selectStudentForPayment = (studentId: number | null) => {
    const student =
      studentId != null ? activeStudents.find((item) => item.id === studentId) : undefined;

    setPaymentForm((previous) => ({
      ...previous,
      student_id: studentId,
      amount: student?.monthly_fee ?? 0,
    }));

    setCashfreeRequest(null);
    setPaymentError(null);
    setPaymentSuccess(null);
  };

  const handleDownloadMonthlyHistoryPdf = async () => {
    if (!canExportMonthlyHistory) {
      setHistoryExportError('Select one month and one year before downloading the PDF backup.');
      return;
    }

    setHistoryExporting(true);
    setHistoryExportError(null);

    try {
      await paymentsApi.downloadMonthlyHistoryPdf(
        Number(historyYearFilter),
        Number(historyMonthFilter),
      );
    } catch (err) {
      console.error('Failed to download monthly payment history PDF.', err);
      setHistoryExportError('Failed to download the monthly PDF backup.');
    } finally {
      setHistoryExporting(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!paymentForm.student_id) {
      setPaymentError('Select a student before recording payment.');
      return;
    }

    if (!selectedStudent) {
      setPaymentError('Selected student is not available.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentSuccess(null);
    setCashfreeRequest(null);

    try {
      await paymentsApi.record({
        student_id: paymentForm.student_id,
        amount: selectedStudent.monthly_fee,
        payment_method: 'upi',
        transaction_id: paymentForm.transaction_id?.trim() || undefined,
        notes: paymentForm.notes?.trim() || undefined,
      });

      setPaymentSuccess(
        'Payment submitted for verification. Coverage, receipt delivery, and superadmin notification will update only after confirmation.',
      );
      setPaymentForm({
        student_id: null,
        amount: 0,
        payment_method: 'upi',
        transaction_id: '',
        notes: '',
      });
      setSelectedStudentPayments([]);

      await fetchPaymentsData(false);
    } catch (err: any) {
      console.error('Failed to record payment.', err);
      setPaymentError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCreateCashfreeRequest = async () => {
    if (!paymentForm.student_id) {
      setPaymentError('Select a student before creating a Cashfree request.');
      return;
    }

    if (!selectedStudent) {
      setPaymentError('Selected student is not available.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      const result = await paymentsApi.createCashfreeRequest({
        student_id: paymentForm.student_id,
      });

      setCashfreeRequest(result);
      setPaymentSuccess(
        `Cashfree ${result.session.mode} request created for ${selectedStudent.name}. The payment stays pending until the provider success callback or superadmin confirmation happens.`,
      );
      await Promise.all([
        fetchPaymentsData(false),
        refreshSelectedStudentPayments(paymentForm.student_id),
      ]);
    } catch (err: any) {
      console.error('Failed to create Cashfree request.', err);
      setPaymentError(err.response?.data?.error || 'Failed to create Cashfree request');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSimulateCashfreeSuccess = async (payment: Payment) => {
    setPaymentActionKey(`cashfree-${payment.id}`);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      await paymentsApi.simulateCashfreeSuccess(payment.id);
      setPaymentSuccess(
        `Mock Cashfree success received for ${payment.receipt_number}. Dashboard totals, receipts, and notifications now reflect the verified payment.`,
      );
      setCashfreeRequest(null);
      await Promise.all([
        fetchPaymentsData(false),
        refreshSelectedStudentPayments(payment.student_id),
      ]);
    } catch (err: any) {
      console.error('Failed to simulate Cashfree success.', err);
      setPaymentError(err.response?.data?.error || 'Failed to simulate Cashfree success');
    } finally {
      setPaymentActionKey(null);
    }
  };

  const handleCopyCashfreeScanValue = async () => {
    if (!cashfreeShareValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(cashfreeShareValue);
      setPaymentError(null);
      setPaymentSuccess(
        cashfreePublicPaymentUrl
          ? 'Secure payment page link copied. The student can open it directly on their phone.'
          : 'Cashfree payment link copied. If scanning is inconvenient, the student can open the same link directly on their phone.',
      );
    } catch (error) {
      console.error('Failed to copy Cashfree payment link.', error);
      setPaymentError('Unable to copy the Cashfree payment link on this device.');
    }
  };

  const handleOpenCashfreeCheckout = async () => {
    if (!activeCashfreeSession?.payment_session_id) {
      setPaymentError('Cashfree payment session ID is not available for this request.');
      return;
    }

    try {
      setPaymentError(null);
      setPaymentSuccess(null);
      await openCashfreeCheckout({
        mode: activeCashfreeSession.mode,
        paymentSessionId: activeCashfreeSession.payment_session_id,
        redirectTarget: '_blank',
      });
      setPaymentSuccess(
        'Cashfree checkout opened. Complete the payment there, then return here and wait for the webhook to mark it paid.',
      );
    } catch (error) {
      console.error('Failed to open Cashfree checkout.', error);
      setPaymentError(
        error instanceof Error ? error.message : 'Unable to open Cashfree checkout right now.',
      );
    }
  };

  const handleConfirmPayment = async (payment: Payment) => {
    if (
      !window.confirm(
        `Confirm payment ${payment.receipt_number} for ${payment.student_name || `Student #${payment.student_id}`}?\n\nUse this only after the real money is visible in the bank account or verified by webhook.`,
      )
    ) {
      return;
    }

    setPaymentActionKey(`confirm-${payment.id}`);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      await paymentsApi.confirm(
        payment.id,
        payment.transaction_id
          ? { verification_reference: payment.transaction_id }
          : {},
      );

      setPaymentSuccess(
        `Payment ${payment.receipt_number} confirmed. Dashboard totals, receipt delivery, and superadmin notifications now use the verified payment.`,
      );
      setCashfreeRequest(null);
      await Promise.all([
        fetchPaymentsData(false),
        refreshSelectedStudentPayments(payment.student_id),
      ]);
    } catch (err: any) {
      console.error('Failed to confirm payment.', err);
      setPaymentError(err.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setPaymentActionKey(null);
    }
  };

  const handleSendReminder = async (payment: PendingPayment) => {
    if (!payment.recommended_reminder_stage) {
      setCommunicationError(
        `Automatic reminders start 3 days before due. ${payment.student_name} is not in that window yet.`,
      );
      setCommunicationSuccess(null);
      return;
    }

    setCommunicationActionKey(`reminder-${payment.student_id}`);
    setCommunicationError(null);
    setCommunicationSuccess(null);

    try {
      const communications = await paymentsApi.sendReminder({
        student_id: payment.student_id,
        channel: 'both',
      });

      const channelSummary = communications.map((item) => item.channel.toUpperCase()).join(' + ');
      setCommunicationSuccess(
        `Reminder saved for ${payment.student_name} on ${channelSummary}.`,
      );
      await fetchPaymentsData(false);
    } catch (err: any) {
      console.error('Failed to send reminder.', err);
      setCommunicationError(err.response?.data?.error || 'Failed to send reminder');
    } finally {
      setCommunicationActionKey(null);
    }
  };

  const handleRunReminderBatch = async () => {
    setCommunicationActionKey('batch-reminders');
    setCommunicationError(null);
    setCommunicationSuccess(null);

    try {
      const result = await paymentsApi.runReminderBatch('both');

      setCommunicationSuccess(
        `Reminder batch processed. ${result.sent} communication log entr${result.sent === 1 ? 'y' : 'ies'} created, ${result.skipped} skipped because they were already sent today.`,
      );
      await fetchPaymentsData(false);
    } catch (err: any) {
      console.error('Failed to run reminder batch.', err);
      setCommunicationError(err.response?.data?.error || 'Failed to run reminder batch');
    } finally {
      setCommunicationActionKey(null);
    }
  };

  const handleSendReceipt = async (payment: Payment) => {
    setCommunicationActionKey(`receipt-${payment.id}`);
    setCommunicationError(null);
    setCommunicationSuccess(null);

    try {
      const communications = await paymentsApi.sendReceipt(payment.id, {
        channel: 'both',
      });

      const channelSummary = communications.map((item) => item.channel.toUpperCase()).join(' + ');
      setCommunicationSuccess(
        `Receipt resent for ${payment.student_name || payment.student_code || `Student #${payment.student_id}`} on ${channelSummary}.`,
      );
      await fetchPaymentsData(false);
    } catch (err: any) {
      console.error('Failed to resend receipt.', err);
      setCommunicationError(err.response?.data?.error || 'Failed to resend receipt');
    } finally {
      setCommunicationActionKey(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <DollarSign className="h-8 w-8 text-purple-600" />
              Payments Management
            </h1>
            <p className="mt-1 text-gray-600">
              Track verified collections, review pending payments, and follow upcoming dues for{' '}
              {branchLabel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={isSuperAdmin ? 'info' : 'success'}>
              {isSuperAdmin ? 'Global View' : 'Branch View'}
            </Badge>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleRunReminderBatch()}
              disabled={loading || paymentLoading || communicationActionKey === 'batch-reminders'}
              isLoading={communicationActionKey === 'batch-reminders'}
              className="flex items-center gap-2"
            >
              Send Due Reminders
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void fetchPaymentsData()}
              disabled={
                loading ||
                paymentLoading ||
                paymentActionKey != null ||
                communicationActionKey != null
              }
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {loading && (
          <Card>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Loading payments...</span>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Failed to load payments</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => void fetchPaymentsData()}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {(communicationSuccess || communicationError) && (
          <Card>
            <div
              className={`rounded-xl border p-4 text-sm ${
                communicationError
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}
            >
              {communicationError || communicationSuccess}
            </div>
          </Card>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-100">
                <p className="text-sm text-purple-700">Today's Verified Collection</p>
                <h2 className="mt-2 text-3xl font-bold text-purple-900">
                  {formatCurrency(todayCollection.amount)}
                </h2>
                <p className="mt-1 text-sm text-purple-700">
                  {todayCollection.count} payment{todayCollection.count === 1 ? '' : 's'}
                </p>
              </Card>

              <Card className="border-sky-200 bg-gradient-to-br from-sky-50 to-blue-100">
                <p className="text-sm text-sky-700">This Month</p>
                <h2 className="mt-2 text-3xl font-bold text-sky-900">
                  {formatCurrency(monthlyRevenue?.total_amount ?? 0)}
                </h2>
                <p className="mt-1 text-sm text-sky-700">
                  {monthlyRevenue?.total_payments ?? 0} payment{monthlyRevenue?.total_payments === 1 ? '' : 's'}
                </p>
              </Card>

              <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-100">
                <p className="text-sm text-red-700">Overdue Renewals</p>
                <h2 className="mt-2 text-3xl font-bold text-red-900">
                  {pendingPayments.filter((payment) => payment.due_status === 'overdue').length}
                </h2>
                <p className="mt-1 text-sm text-red-700">
                  {formatCurrency(overdueAmount)} pending now
                </p>
              </Card>

              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100">
                <p className="text-sm text-amber-700">Upcoming Renewals</p>
                <h2 className="mt-2 text-3xl font-bold text-amber-900">
                  {dueTodayCount + dueSoonCount}
                </h2>
                <p className="mt-1 text-sm text-amber-700">
                  {dueTodayCount} due today | {dueSoonCount} in 7 days
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card>
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Submit Payment</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Submit a payment for verification before coverage renews
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100">
                      <Plus className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Student
                      </label>
                      <select
                        value={paymentForm.student_id || ''}
                        onChange={(event) =>
                          selectStudentForPayment(
                            event.target.value ? Number(event.target.value) : null,
                          )
                        }
                        disabled={paymentLoading}
                        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 transition-all focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                      >
                        <option value="">Select student</option>
                        {activeStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} ({student.student_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      label="Amount"
                      value={selectedStudent ? selectedStudent.monthly_fee.toString() : ''}
                      readOnly
                      helperText="Amount is locked to the student's monthly fee"
                      fullWidth
                    />

                    <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <CalendarClock className="mt-0.5 h-5 w-5 text-purple-600" />
                        <div className="space-y-2 text-sm text-gray-700">
                          <p className="font-semibold text-gray-900">Renewal preview</p>
                          {selectedStudent ? (
                            selectedStudentPaymentsLoading ? (
                              <p>Loading current coverage...</p>
                            ) : (
                              <>
                                {selectedPendingCashfreePayment && (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                                    A Cashfree request for this student is already pending from{' '}
                                    {formatDateTime(
                                      selectedPendingCashfreePayment.created_at ||
                                        selectedPendingCashfreePayment.payment_date,
                                    )}
                                    . Use the Cashfree section below to continue that request.
                                  </div>
                                )}
                                {selectedPendingManualPayment && (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                                    A payment for this student is already pending verification from{' '}
                                    {formatDateTime(
                                      selectedPendingManualPayment.created_at ||
                                        selectedPendingManualPayment.payment_date,
                                    )}
                                    .
                                  </div>
                                )}
                                <p>
                                  Last verified payment:{' '}
                                  <span className="font-medium">
                                    {selectedLatestPayment
                                      ? formatDate(selectedLatestPayment.payment_date)
                                      : 'No payment yet'}
                                  </span>
                                </p>
                                <p>
                                  Active through:{' '}
                                  <span className="font-medium">
                                    {selectedRenewalStatus?.paid_through_date
                                      ? formatDate(selectedRenewalStatus.paid_through_date)
                                      : selectedLatestPayment
                                        ? formatDate(selectedLatestPayment.coverage_end_date)
                                        : 'Not covered yet'}
                                  </span>
                                </p>
                                {selectedRenewalStatus && (
                                  <p>
                                    Current status:{' '}
                                    <Badge
                                      variant={getRenewalVariant(selectedRenewalStatus.due_status)}
                                      size="sm"
                                    >
                                      {getRenewalLabel(selectedRenewalStatus.due_status)}
                                    </Badge>
                                  </p>
                                )}
                                {renewalPreview && (
                                  <>
                                    <p>
                                      Projected coverage after confirmation:{' '}
                                      <span className="font-medium">
                                        {formatDate(renewalPreview.coverageStart)} -{' '}
                                        {formatDate(renewalPreview.coverageEnd)}
                                      </span>
                                    </p>
                                    <p>
                                      Next due after this renewal:{' '}
                                      <span className="font-medium">
                                        {formatDate(renewalPreview.nextDue)}
                                      </span>
                                    </p>
                                  </>
                                )}
                              </>
                            )
                          ) : (
                            <p>Select a student to preview their current coverage and next due date.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Input
                      label="Transaction ID"
                      placeholder="Optional UPI reference"
                      value={paymentForm.transaction_id || ''}
                      onChange={(event) =>
                        updatePaymentForm('transaction_id', event.target.value)
                      }
                      helperText="Optional"
                      fullWidth
                      disabled={paymentLoading}
                    />

                    <Input
                      label="Notes"
                      placeholder="Optional payment note"
                      value={paymentForm.notes || ''}
                      onChange={(event) => updatePaymentForm('notes', event.target.value)}
                      helperText="Optional"
                      fullWidth
                      disabled={paymentLoading}
                    />

                    {hasSelectedPendingPayment && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {selectedPendingCashfreePayment
                          ? 'This student already has a pending Cashfree request. Continue that flow below or wait for webhook confirmation before creating another payment.'
                          : 'This student already has a pending manual payment submission. Confirm or resolve it before creating another payment.'}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      isLoading={paymentLoading}
                      onClick={handleSubmitPayment}
                      disabled={!selectedStudent || paymentLoading || hasSelectedPendingPayment}
                      fullWidth
                    >
                      {selectedPendingCashfreePayment
                        ? 'Cashfree Request Pending'
                        : selectedPendingManualPayment
                          ? 'Verification Pending'
                          : 'Submit for Verification'}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCreateCashfreeRequest}
                      disabled={!selectedStudent || paymentLoading || hasSelectedPendingPayment}
                      fullWidth
                    >
                      {hasSelectedPendingPayment
                        ? 'Existing Payment Pending'
                        : 'Create Cashfree Request'}
                    </Button>

                    {(cashfreeRequest || selectedPendingCashfreePayment) && (
                      <div className="rounded-3xl border border-sky-200 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-4 text-sm text-sky-950 shadow-sm sm:p-5">
                        <div className="flex flex-col gap-5">
                          <div className="w-full">
                            <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
                              <div className="mb-3 flex items-center gap-2 text-sky-900">
                                <ScanLine className="h-4 w-4" />
                                <p className="font-semibold">Student Scan QR</p>
                              </div>
                              {cashfreeScanValue ? (
                                <>
                                  <div className="flex justify-center rounded-2xl border border-sky-100 bg-white p-3">
                                    <QRCodeSVG
                                      value={cashfreeScanValue}
                                      size={180}
                                      bgColor="#FFFFFF"
                                      fgColor="#0f172a"
                                      level="M"
                                      includeMargin
                                    />
                                  </div>
                                  <p className="mt-3 text-xs leading-5 text-sky-800">
                                    Show this on the admin computer screen. The student scans it with
                                    GPay, PhonePe, Paytm, or any UPI app.
                                  </p>
                                </>
                              ) : (
                                <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-800">
                                  Cashfree did not return a QR-friendly link for this order. Use the
                                  hosted checkout button below with the payment session instead.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                                <Smartphone className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-sky-950">Cashfree Payment Request</p>
                                <p className="mt-1 text-xs leading-5 text-sky-800">
                                  The fee amount is already locked from the student&apos;s plan, so the
                                  admin does not need to type rupees manually.
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              <div className="rounded-2xl border border-sky-100 bg-white/80 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                  Student
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">
                                  {selectedStudent?.name ??
                                    selectedPendingCashfreePayment?.student_name ??
                                    'Selected student'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {selectedStudent?.student_id ??
                                    selectedPendingCashfreePayment?.student_code ??
                                    'Student ID'}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-sky-100 bg-white/80 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                  Amount
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">
                                  {formatCurrency(
                                    selectedStudent?.monthly_fee ??
                                      selectedPendingCashfreePayment?.amount ??
                                      0,
                                  )}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Locked to the student&apos;s current fee plan
                                </p>
                              </div>
                              <div className="rounded-2xl border border-sky-100 bg-white/80 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                  Order ID
                                </p>
                                <p className="mt-1 break-all font-mono text-xs text-slate-800">
                                  {activeCashfreeSession?.order_id ??
                                    selectedPendingCashfreePayment?.transaction_id ??
                                    '-'}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-sky-100 bg-white/80 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                  Status
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">
                                  {activeCashfreeSession?.mode ?? 'mock-ready'} request
                                </p>
                                <p className="text-xs text-slate-500">
                                  Payment stays pending until the success callback arrives
                                </p>
                              </div>
                            </div>

                            {activeCashfreeSession?.payment_session_id && (
                              <div className="rounded-2xl border border-sky-100 bg-white/80 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                  Session ID
                                </p>
                                <p className="mt-1 break-all font-mono text-xs text-slate-800">
                                  {activeCashfreeSession.payment_session_id}
                                </p>
                              </div>
                            )}

                            {activeCashfreeSession?.expires_at && (
                              <p className="text-xs text-sky-800">
                                This request expires around{' '}
                                <span className="font-medium">
                                  {formatDateTime(activeCashfreeSession.expires_at)}
                                </span>
                                .
                              </p>
                            )}

                            <p className="rounded-2xl border border-sky-100 bg-white/70 p-3 text-xs leading-5 text-sky-900">
                              {activeCashfreeSession?.note ??
                                'This pending payment can later be confirmed by a real Cashfree webhook after you replace the dummy env values.'}
                            </p>

                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => void handleCopyCashfreeScanValue()}
                                disabled={!cashfreeShareValue}
                                fullWidth
                              >
                                <Copy className="h-4 w-4" />
                                {cashfreePublicPaymentUrl ? 'Copy Secure Payment Link' : 'Copy Scan Link'}
                              </Button>
                              {activeCashfreeSession?.payment_session_id && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => void handleOpenCashfreeCheckout()}
                                  fullWidth
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Open Cashfree Checkout
                                </Button>
                              )}
                              {cashfreeCheckoutUrl && (
                                <a
                                  href={cashfreeCheckoutUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-6 py-2.5 text-sm font-semibold text-sky-800 transition hover:border-sky-300 hover:bg-sky-50"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Open Hosted Checkout
                                </a>
                              )}
                            </div>

                            {isSuperAdmin && selectedPendingCashfreePayment && (
                              <div className="pt-1">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    void handleSimulateCashfreeSuccess(selectedPendingCashfreePayment)
                                  }
                                  disabled={
                                    paymentActionKey ===
                                    `cashfree-${selectedPendingCashfreePayment.id}`
                                  }
                                  isLoading={
                                    paymentActionKey ===
                                    `cashfree-${selectedPendingCashfreePayment.id}`
                                  }
                                  className="w-full"
                                >
                                  Simulate Cashfree Success
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {paymentError}
                      </div>
                    )}

                    {paymentSuccess && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        {paymentSuccess}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Renewal Watchlist</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Students who are overdue, due today, or due within the next 7 days
                        </p>
                      </div>

                      <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search student, branch, or phone..."
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredPendingPayments.length === 0 ? (
                    <div className="p-10 text-center">
                      <Wallet className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="font-semibold text-gray-900">
                        {pendingPayments.length === 0
                          ? 'No renewals need attention right now'
                          : 'No student matched your search'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {pendingPayments.length === 0
                          ? 'Everyone visible is currently within their paid period.'
                          : 'Try a different search term.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Student
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Last Payment
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Active Through
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Next Due
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Amount
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredPendingPayments.map((payment, index) => (
                            <motion.tr
                              key={payment.student_id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.04 }}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {payment.student_name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {payment.student_code} | {payment.student_phone}
                                  </p>
                                  {isSuperAdmin && (
                                    <p className="text-xs text-gray-500">{payment.branch_name}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <Badge variant={getRenewalVariant(payment.due_status)}>
                                    {getRenewalLabel(payment.due_status)}
                                  </Badge>
                                  <p className="text-xs text-gray-500">
                                    {payment.due_status === 'overdue'
                                      ? `${Math.abs(payment.days_until_due)} day(s) late`
                                      : payment.due_status === 'due_today'
                                        ? 'Renew today'
                                        : `${payment.days_until_due} day(s) left`}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(payment.last_payment_date)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(payment.paid_through_date)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {formatDate(payment.next_due_date)}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                {payment.due_status === 'due_soon'
                                  ? `${formatCurrency(payment.renewal_amount)} upcoming`
                                  : formatCurrency(payment.total_pending)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => selectStudentForPayment(payment.student_id)}
                                    className="font-medium text-purple-600 transition-colors hover:text-purple-700"
                                  >
                                    Pay Now
                                  </button>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => void handleSendReminder(payment)}
                                      disabled={
                                        !payment.recommended_reminder_stage ||
                                        communicationActionKey === `reminder-${payment.student_id}`
                                      }
                                      className={`font-medium transition-colors ${
                                        !payment.recommended_reminder_stage
                                          ? 'cursor-not-allowed text-gray-400'
                                          : 'text-sky-600 hover:text-sky-700'
                                      }`}
                                    >
                                      {communicationActionKey === `reminder-${payment.student_id}`
                                        ? 'Sending...'
                                        : payment.recommended_reminder_stage
                                          ? 'Send Reminder'
                                          : 'Starts 3 days before'}
                                    </button>
                                  </div>
                                  {payment.recommended_reminder_stage && (
                                    <Badge
                                      variant={getReminderStageVariant(
                                        payment.recommended_reminder_stage,
                                      )}
                                      size="sm"
                                    >
                                      {getReminderStageLabel(payment.recommended_reminder_stage)}
                                    </Badge>
                                  )}
                                  {payment.last_reminder_at && (
                                    <p className="text-xs text-gray-500">
                                      Last reminder: {formatDateTime(payment.last_reminder_at)} via{' '}
                                      {payment.last_reminder_channel?.toUpperCase()}
                                    </p>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Payment History</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Old payments stay stored in the database. Filter by month and year to open last month or any earlier payment history, then download a monthly PDF backup when needed.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 xl:items-end">
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={historyMonthFilter}
                            onChange={(event) => {
                              setHistoryPage(1);
                              setHistoryExportError(null);
                              setHistoryMonthFilter(
                                event.target.value === 'all'
                                  ? 'all'
                                  : Number(event.target.value),
                              );
                            }}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="all">All months</option>
                            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                              <option key={month} value={month}>
                                {new Date(2026, month - 1, 1).toLocaleString('en-IN', {
                                  month: 'long',
                                })}
                              </option>
                            ))}
                          </select>

                          <select
                            value={historyYearFilter}
                            onChange={(event) => {
                              setHistoryPage(1);
                              setHistoryExportError(null);
                              setHistoryYearFilter(
                                event.target.value === 'all'
                                  ? 'all'
                                  : Number(event.target.value),
                              );
                            }}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="all">All years</option>
                            {historyYearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="relative w-full min-w-[14rem] xl:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search student, receipt, branch..."
                              value={historySearchQuery}
                              onChange={(event) => {
                                setHistoryExportError(null);
                                setHistorySearchQuery(event.target.value);
                              }}
                              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="info">{historyTotalPayments}</Badge>
                            <span className="text-xs font-medium text-gray-500">
                              Page {historyPage} of {historyTotalPages}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <p className="text-xs text-gray-500">
                            {canExportMonthlyHistory
                              ? `Download ${selectedHistoryMonthLabel} ${historyYearFilter} as a PDF backup.`
                              : 'Select one month and one year to download a monthly PDF backup.'}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isLoading={historyExporting}
                            disabled={!canExportMonthlyHistory}
                            onClick={() => void handleDownloadMonthlyHistoryPdf()}
                          >
                            {!historyExporting && <Download className="h-4 w-4" />}
                            Download PDF
                          </Button>
                        </div>

                        {historyExportError && (
                          <p className="text-sm font-medium text-red-600">{historyExportError}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {recentPayments.length === 0 ? (
                    <div className="p-10 text-center">
                      <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="font-semibold text-gray-900">
                        {appliedHistorySearchQuery
                          ? 'No payment matched your history search'
                          : 'No payments found for the selected history window'}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {appliedHistorySearchQuery
                          ? 'Try another student name, receipt number, transaction ID, or branch.'
                          : 'Try another month or year to open an older payment history.'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                Student
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                Coverage
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                Amount
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                Paid On
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                Receipt
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                Status
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {recentPayments.map((payment, index) => (
                              <motion.tr
                                key={payment.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className="transition-colors hover:bg-gray-50"
                              >
                                <td className="px-6 py-4">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {payment.student_name || 'Unknown Student'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {payment.student_code || `Student #${payment.student_id}`}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {formatDateRange(
                                    payment.coverage_start_date,
                                    payment.coverage_end_date,
                                  )}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  {formatCurrency(payment.amount)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {formatDate(payment.payment_date)}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-purple-700">
                                  {payment.receipt_number}
                                </td>
                                <td className="px-6 py-4">
                                  <Badge variant={getPaymentStatusVariant(payment.status)}>
                                    {getPaymentStatusLabel(payment.status)}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4">
                                  {payment.status === 'pending' ? (
                                    isSuperAdmin ? (
                                      <div className="space-y-2">
                                        <button
                                          type="button"
                                          onClick={() => void handleConfirmPayment(payment)}
                                          disabled={paymentActionKey === `confirm-${payment.id}`}
                                          className={`font-medium transition-colors ${
                                            paymentActionKey === `confirm-${payment.id}`
                                              ? 'cursor-not-allowed text-gray-400'
                                              : 'text-amber-700 hover:text-amber-800'
                                          }`}
                                        >
                                          {paymentActionKey === `confirm-${payment.id}`
                                            ? 'Confirming...'
                                            : 'Confirm Payment'}
                                        </button>
                                        {payment.transaction_id?.startsWith('CFPAY-') && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void handleSimulateCashfreeSuccess(payment)
                                            }
                                            disabled={paymentActionKey === `cashfree-${payment.id}`}
                                            className={`block font-medium transition-colors ${
                                              paymentActionKey === `cashfree-${payment.id}`
                                                ? 'cursor-not-allowed text-gray-400'
                                                : 'text-sky-700 hover:text-sky-800'
                                            }`}
                                          >
                                            {paymentActionKey === `cashfree-${payment.id}`
                                              ? 'Simulating...'
                                              : 'Simulate Cashfree'}
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-500">
                                        Awaiting superadmin verification
                                      </span>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => void handleSendReceipt(payment)}
                                      disabled={communicationActionKey === `receipt-${payment.id}`}
                                      className={`font-medium transition-colors ${
                                        communicationActionKey === `receipt-${payment.id}`
                                          ? 'cursor-not-allowed text-gray-400'
                                          : 'text-sky-600 hover:text-sky-700'
                                      }`}
                                    >
                                      {communicationActionKey === `receipt-${payment.id}`
                                        ? 'Sending...'
                                        : 'Resend Receipt'}
                                    </button>
                                  )}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-gray-600">
                          Showing {(historyPage - 1) * historyPageSize + 1}-
                          {Math.min(historyPage * historyPageSize, historyTotalPayments)} of{' '}
                          {historyTotalPayments} payments
                        </p>

                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={historyPage <= 1}
                            onClick={() => setHistoryPage((previous) => Math.max(previous - 1, 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={historyPage >= historyTotalPages}
                            onClick={() =>
                              setHistoryPage((previous) =>
                                Math.min(previous + 1, historyTotalPages),
                              )
                            }
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                <Card noPadding>
                  <div className="border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          Reminder & Receipt History
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Every due reminder and payment receipt is stored here so admins can track
                          what was sent for each month.
                        </p>
                      </div>
                      <Badge variant="info">{communicationHistory.length}</Badge>
                    </div>
                  </div>

                  {communicationHistory.length === 0 ? (
                    <div className="p-10 text-center">
                      <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="font-semibold text-gray-900">No communication history yet</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Fee reminders and payment receipts will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Student
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Type
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Channel
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Sent On
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                              Details
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {communicationHistory.map((communication, index) => (
                            <motion.tr
                              key={communication.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {communication.student_name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {communication.student_code} | {communication.recipient_phone}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <Badge
                                    variant={
                                      communication.communication_type === 'payment_receipt'
                                        ? 'success'
                                        : communication.reminder_stage === 'overdue'
                                          ? 'danger'
                                          : communication.reminder_stage === 'due_today'
                                            ? 'warning'
                                            : 'info'
                                    }
                                  >
                                    {getCommunicationTypeLabel(communication)}
                                  </Badge>
                                  {communication.receipt_number && (
                                    <p className="text-xs text-gray-500">
                                      Receipt {communication.receipt_number}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                {communication.channel.toUpperCase()}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <Badge
                                    variant={getCommunicationStatusVariant(
                                      communication.delivery_status,
                                    )}
                                  >
                                    {getCommunicationStatusLabel(communication)}
                                  </Badge>
                                  <p className="text-xs text-gray-500">
                                    {communication.delivery_mode === 'log_only'
                                      ? 'Stored in system history'
                                      : communication.provider_name ||
                                        (communication.delivery_mode === 'webhook'
                                          ? 'Webhook'
                                          : 'Provider')}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDateTime(communication.sent_at)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="max-w-xl space-y-1 text-sm text-gray-600">
                                  {communication.subject && (
                                    <p className="font-medium text-gray-900">
                                      {communication.subject}
                                    </p>
                                  )}
                                  <p>{communication.message_body}</p>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-100">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 text-blue-700" />
                    <div>
                      <p className="font-semibold text-blue-900">How renewals work now</p>
                      <p className="mt-1 text-sm text-blue-800">
                        Each payment extends the student by the next 30-day coverage cycle. The system now tracks
                        active through and next due dates directly, stores every reminder and receipt in the database,
                        and can send the 3-day, due-today, and overdue reminder set from this page.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
