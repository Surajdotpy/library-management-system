import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function StudentPaymentPage() {
  const { paymentId } = useParams();

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch payment once
  useEffect(() => {
    async function fetchPayment() {
      try {
        const res = await fetch(`/api/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        const data: any = await res.json();
        setPayment(data.data);
      } catch (error) {
        console.error("Error fetching payment:", error);
      } finally {
        setLoading(false);
      }
    }

    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId]);

  // Auto refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!paymentId) return;

      try {
        const res = await fetch(`/api/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        const data: any = await res.json();
        setPayment(data.data);
      } catch (error) {
        console.error("Auto refresh error:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [paymentId]);

  // Loading state
  if (loading) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  // Not found
  if (!payment) {
    return (
      <div className="text-center mt-20 text-red-500">
        Payment not found
      </div>
    );
  }

  // Success screen
  if (payment.status === "paid") {
    return (
      <div className="text-center mt-20 text-green-600">
        <h1 className="text-2xl font-bold">Payment Successful ✅</h1>
        <p>₹{payment.amount} received</p>
      </div>
    );
  }

  // Payment screen
  return (
    <div className="text-center mt-20">
      <h1 className="text-2xl font-bold">Pay ₹{payment.amount}</h1>

      <p className="mb-4">
        {payment.student_name || "Student"}
      </p>

      {payment.gateway_upi_intent && (
        <div className="flex justify-center">
          <QRCodeSVG
            value={payment.gateway_upi_intent}
            size={200}
          />
        </div>
      )}

      <p className="mt-4 text-gray-500">
        Scan QR to pay
      </p>
    </div>
  );
}