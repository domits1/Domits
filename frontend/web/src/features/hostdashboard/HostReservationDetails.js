import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "../../styles/sass/hostdashboard/reservationdetails.module.scss";
import spinner from "../../images/spinnner.gif";

export default function ReservationDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pobieramy ID z URL-a
  const params = new URLSearchParams(location.search);
  const reservationId = params.get("id");

  useEffect(() => {
    if (!reservationId) return;

    const fetchReservationDetails = async () => {
      try {
        const response = await fetch(
          `https://api.domits.com/booking/getBookingById?id=${reservationId}`
        );

        const data = await response.json();

        if (response.ok && data.response) {
          setReservation(data.response);
        } else {
          setError("Reservation not found");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load reservation details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservationDetails();
  }, [reservationId]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <img src={spinner} alt="Loading..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  return (
    <main className="page-body">
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Reservation Details</h2>
      </div>

      <section className={styles.detailsContainer}>
        <div className={styles.detailCard}>
          <h3>General</h3>
          <p><strong>Reservation ID:</strong> {reservation.reservationId}</p>
          <p><strong>Status:</strong> {reservation.status}</p>
          <p><strong>Guests:</strong> {reservation.guestsCount}</p>
          <p><strong>Late Payment:</strong> {reservation.latePayment ? "Yes" : "No"}</p>
        </div>

        <div className={styles.detailCard}>
          <h3>Dates</h3>
          <p><strong>Created At:</strong> {new Date(reservation.createdAt).toLocaleString()}</p>
          <p><strong>Arrival:</strong> {new Date(reservation.arrivalDate).toLocaleDateString()}</p>
          <p><strong>Departure:</strong> {new Date(reservation.departureDate).toLocaleDateString()}</p>
        </div>

        <div className={styles.detailCard}>
          <h3>Guest</h3>
          <p><strong>ID:</strong> {reservation.guest.id}</p>
          <p><strong>Name:</strong> {reservation.guest.name}</p>
        </div>

        <div className={styles.detailCard}>
          <h3>Host</h3>
          <p><strong>ID:</strong> {reservation.host.id}</p>
          <p><strong>Name:</strong> {reservation.host.name}</p>
        </div>

        <div className={styles.detailCard}>
          <h3>Property</h3>
          <p><strong>ID:</strong> {reservation.propertyId}</p>
        </div>

        <div className={styles.detailCard}>
          <h3>Payment</h3>
          <p><strong>Payment ID:</strong> {reservation.paymentId}</p>
        </div>
      </section>
    </main>
  );
}
