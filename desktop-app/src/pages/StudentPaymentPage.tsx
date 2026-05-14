import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { PublicPaymentDetails } from '@/types';
import { openCashfreeCheckout } from '@/lib/payments/cashfree';

const PUBLIC_PAYMENTS_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

export default function StudentPaymentPage() {
  const { accessToken } = useParams();
  const [payment, setPayment] = useState<PublicPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const encodedAccessToken = accessToken ? encodeURIComponent(accessToken) : null;
  const publicPaymentUrl = encodedAccessToken
    ? `${PUBLIC_PAYMENTS_BASE_URL}/payments/public/${encodedAccessToken}`
    : null;

  async function handleOpenCashfreeCheckout() {
    if (!payment?.gateway_session_id) {
      setError('Cashfree payment session is unavailable for this payment.');
      return;
    }

    try {
      setError(null);
      await openCashfreeCheckout({
        mode: payment.gateway_mode,
        paymentSessionId: payment.gateway_session_id,
        redirectTarget: '_self',
      });
    } catch (checkoutError) {
      console.error('Error opening Cashfree checkout:', checkoutError);
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Unable to open the Cashfree checkout right now',
      );
    }
  }

  useEffect(() => {
    async function fetchPayment() {
      if (!publicPaymentUrl) {
        setPayment(null);
        setLoading(false);
        setError('Payment link is invalid or expired');
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(publicPaymentUrl);
        const data = await res.json();

        if (!res.ok) {
          setPayment(null);
          setError(data?.error || 'Payment link is invalid or expired');
          return;
        }

        setPayment(data.data ?? null);
        setError(null);
      } catch (fetchError) {
        console.error('Error fetching payment:', fetchError);
        setPayment(null);
        setError('Unable to load payment details right now');
      } finally {
        setLoading(false);
      }
    }

    if (publicPaymentUrl) {
      void fetchPayment();
      return;
    }

    setLoading(false);
    setError('Payment link is invalid or expired');
  }, [publicPaymentUrl]);

  useEffect(() => {
    if (!publicPaymentUrl) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(publicPaymentUrl);
        const data = await res.json();

        if (!res.ok) {
          setPayment(null);
          setError(data?.error || 'Payment link is invalid or expired');
          return;
        }

        setPayment(data.data ?? null);
        setError(null);
      } catch (fetchError) {
        console.error('Auto refresh error:', fetchError);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [publicPaymentUrl]);

  if (loading) {
    return <div className="mt-20 text-center">Loading...</div>;
  }

  if (!payment) {
    return <div className="mt-20 text-center text-red-500">{error || 'Payment not found'}</div>;
  }

  if (payment.status === 'paid') {
    return (
      <div className="mt-20 text-center text-green-600">
        <h1 className="text-2xl font-bold">Payment Successful</h1>
        <p>Rs {payment.amount} received</p>
      </div>
    );
  }

  return (
    <div className="mt-20 text-center">
      <h1 className="text-2xl font-bold">Pay Rs {payment.amount}</h1>
      <p className="mb-2">{payment.student_name || 'Student'}</p>
      <p className="mb-4 text-sm text-gray-500">{payment.branch_name}</p>

      {payment.gateway_upi_intent && (
        <div className="flex justify-center">
          <QRCodeSVG value={payment.gateway_upi_intent} size={200} />
        </div>
      )}

      {!payment.gateway_upi_intent && payment.gateway_checkout_url && (
        <p className="mt-4">
          <a
            href={payment.gateway_checkout_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 underline"
          >
            Open secure payment page
          </a>
        </p>
      )}

      {!payment.gateway_upi_intent && payment.gateway_session_id && (
        <p className="mt-4">
          <button
            type="button"
            onClick={() => void handleOpenCashfreeCheckout()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Open Cashfree Checkout
          </button>
        </p>
      )}

      <p className="mt-4 text-gray-500">
        {payment.gateway_upi_intent
          ? 'Scan QR to pay'
          : payment.gateway_session_id
            ? 'Use the Cashfree checkout button to continue'
            : 'Use the secure payment link to continue'}
      </p>

      {!payment.gateway_upi_intent && !payment.gateway_checkout_url && (
        <p className="mt-4 text-sm text-amber-600">
          Payment is pending. If the QR did not load, continue with the Cashfree checkout button.
        </p>
      )}
    </div>
  );
}
