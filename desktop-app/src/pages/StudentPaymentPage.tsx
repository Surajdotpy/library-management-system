import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { PublicPaymentDetails } from '@/types';

export default function StudentPaymentPage() {
  const { accessToken } = useParams();
  const [payment, setPayment] = useState<PublicPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const encodedAccessToken = accessToken ? encodeURIComponent(accessToken) : null;

  useEffect(() => {
    async function fetchPayment() {
      try {
        const res = await fetch(`/api/payments/public/${encodedAccessToken}`);
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

    if (encodedAccessToken) {
      void fetchPayment();
      return;
    }

    setLoading(false);
    setError('Payment link is invalid or expired');
  }, [encodedAccessToken]);

  useEffect(() => {
    if (!encodedAccessToken) {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/public/${encodedAccessToken}`);
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
  }, [encodedAccessToken]);

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

      <p className="mt-4 text-gray-500">
        {payment.gateway_upi_intent ? 'Scan QR to pay' : 'Use the secure payment link to continue'}
      </p>
    </div>
  );
}
