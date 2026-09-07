import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Auth } from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY.js";
import spinner from "../../images/spinnner.gif";
import "./paymentsguestdashboard.css";

const PAYMENTS_API =
  "https://j1ids2iygi.execute-api.eu-north-1.amazonaws.com/default/FetchGuestPayments";

function formatAmount(amount, currency = "EUR") {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(amount) / 100);
}

function getInvoiceUrl(payment) {
  return (
    payment.invoiceUrl ||
    payment.receiptUrl ||
    payment.invoice?.url ||
    payment.receipt?.url ||
    null
  );
}

function getPaymentStatus(payment) {
  return payment.status || payment.paymentStatus || "Paid";
}

function downloadPayments(payments) {
  const rows = [
    ["Description", "Date", "Amount", "Currency", "Status"],
    ...payments.map((payment) => [
      payment.description || payment.productName || "Reservation payment",
      payment.createdAt ? DateFormatterDD_MM_YYYY(payment.createdAt) : "",
      Number(payment.amount || 0) / 100,
      (payment.currency || "EUR").toUpperCase(),
      getPaymentStatus(payment),
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "domits-payments.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const PaymentsGuestDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const userInfo = await Auth.currentUserInfo();
      const userId = userInfo?.attributes?.sub;
      if (!userId) {
        throw new Error("The signed-in guest could not be identified.");
      }

      const response = await fetch(PAYMENTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error(`Payment request failed with status ${response.status}.`);
      }

      const data = await response.json();
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
    } catch (fetchError) {
      console.error("Error fetching guest payments:", fetchError);
      setPayments([]);
      setError("We could not load your payment information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalPaid = useMemo(
    () => payments.reduce((total, payment) => total + Number(payment.amount || 0), 0),
    [payments],
  );

  if (loading) {
    return (
      <main className="guest-payments page-body" aria-busy="true">
        <img src={spinner} alt="Loading payments" className="guest-payments__spinner" />
      </main>
    );
  }

  return (
    <main className="guest-payments page-body">
      <header className="guest-payments__header">
        <div>
          <h1>Payments</h1>
          <p>View your reservation charges, payment status, and available receipts.</p>
        </div>
        <button type="button" className="guest-payments__secondary-button" onClick={fetchPayments}>
          Refresh
        </button>
      </header>

      {error ? (
        <section className="guest-payments__state" role="alert">
          <h2>Payments unavailable</h2>
          <p>{error}</p>
          <button type="button" className="guest-payments__primary-button" onClick={fetchPayments}>
            Try again
          </button>
        </section>
      ) : (
        <>
          <section className="guest-payments__summary" aria-label="Payment summary">
            <div>
              <span>Total paid</span>
              <strong>{formatAmount(totalPaid)}</strong>
            </div>
            <div>
              <span>Transactions</span>
              <strong>{payments.length}</strong>
            </div>
            <button
              type="button"
              className="guest-payments__secondary-button"
              onClick={() => downloadPayments(payments)}
              disabled={!payments.length}
            >
              Download CSV
            </button>
          </section>

          {payments.length === 0 ? (
            <section className="guest-payments__state">
              <h2>No payments yet</h2>
              <p>Completed reservation payments will appear here.</p>
            </section>
          ) : (
            <section className="guest-payments__list" aria-label="Payment history">
              <h2>Payment history</h2>
              {payments.map((payment, index) => {
                const invoiceUrl = getInvoiceUrl(payment);
                return (
                  <article className="guest-payments__item" key={payment.paymentId || payment.id || index}>
                    <div>
                      <h3>{payment.productName || "Reservation payment"}</h3>
                      <p>{payment.description || "Accommodation reservation"}</p>
                    </div>
                    <div className="guest-payments__details">
                      <span>{payment.createdAt ? DateFormatterDD_MM_YYYY(payment.createdAt) : "Date unavailable"}</span>
                      <strong>{formatAmount(payment.amount, payment.currency)}</strong>
                      <span className="guest-payments__status">{getPaymentStatus(payment)}</span>
                      {invoiceUrl ? (
                        <a href={invoiceUrl} target="_blank" rel="noreferrer">
                          View invoice
                        </a>
                      ) : (
                        <span className="guest-payments__unavailable">Invoice unavailable</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
};

export { formatAmount, getInvoiceUrl };
export default PaymentsGuestDashboard;
