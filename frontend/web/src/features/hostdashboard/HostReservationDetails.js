import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./HostReservationDetails.module.css";
import { FiMapPin } from "react-icons/fi";
import { getGuestBookingPropertyDetails } from "../guestdashboard/services/bookingAPI";

const HostReservationDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const propertyId = id;

  const [b, setB] = useState(null);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

  const mapDataFromBookingDetails = (data) => {
  return {
    guestId: data.guestId,
    title: data.property?.title,
    city: data.propertyLocation?.city,
    country: data.propertyLocation?.country,
    image: data.propertyImages?.[0]?.image,

    arrivaldate: data.arrivalDate,
    departuredate: data.departureDate,
    guests: data.guests,

    guestname: data.guestName || "Guest",
    guestemail: data.guestEmail || "",
    guestphone: data.guestPhone || "",

    specialRequest: data.specialRequest,

    pricePerNight: data.pricing?.roomRate,
    cleaningFee: data.pricing?.cleaning,

    paymentMethod: data.payment?.method,
    last4: data.payment?.last4,

    reservationId: data.bookingId,
    confirmationCode: data.bookingId?.slice(0, 6),

    checkinInstructions: data.checkIn?.from
      ? `${data.checkIn.from} - ${data.checkIn.till}`
      : "",

    houseRules: data.rules || [],

    cancellationPolicy: data.cancellationPolicy || "Flexible",
  };
};

  useEffect(() => {
    const load = async () => {
        try {
          const data = await getGuestBookingPropertyDetails(id);
 
          setB(mapDataFromBookingDetails(data));
        } catch (err) {
          console.error(err);
       }
    };

    load();
    }, [id]);

  if (!b) {
    return <div className={styles.container}>Loading...</div>;
  }

  const nights =
    (new Date(b.departuredate) - new Date(b.arrivaldate)) /
    (1000 * 60 * 60 * 24);

  const total =
  (b.pricePerNight || 0) * nights + (b.cleaningFee || 0);
  
  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        ← Back to reservations
      </button>

      <h1 className={styles.title}>{b.title}</h1>

      <div className={styles.meta}>
        <span className={styles.status}>Confirmed</span>
        <span className={styles.channel}>Booked via Direct</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Property</span>
            </div>

            <div className={styles.property}>
              <img src={b.image} className={styles.image} />

              <div className={styles.propertyDetails}>
                <h4>{b.title}</h4>

                <p className={styles.location}>
                  <FiMapPin /> {b.city}, {b.country}
                </p>

                <p>
                  {formatDate(b.arrivaldate)} →{" "}
                  {formatDate(b.departuredate)}
                </p>

                <p>
                  {nights} nights • {b.guests} guests
                </p>

                <div className={styles.reservationMeta}>
                  <span>Reservation ID: {b.reservationId}</span>
                  <span>Confirmation: {b.confirmationCode}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.blockHeader}>
                <span>Guest</span>
              </div>

              <button
                className={styles.secondaryBtn}
                onClick={() =>
                  navigate("/hostdashboard/messages", {
                    state: { guestId: b.guestId },
                  })
                }
              >
                Message guest
              </button>
            </div>

            <div className={styles.guestRow}>
              <div className={styles.avatar}>
                {b.guestname?.charAt(0)}
              </div>

              <div className={styles.guestInfo}>
                <div>{b.guestname}</div>
                <div className={styles.subText}>{b.guestemail}</div>
                <div className={styles.subText}>{b.guestphone}</div>
              </div>

              {b.specialRequest && (
                <div className={styles.request}>
                  Special request: {b.specialRequest}
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Payment</span>
            </div>

            <div className={styles.payment}>
              <div className={styles.row}>
                <span>
                  €{b.pricePerNight} × {nights} nights
                </span>
                <span>€{b.pricePerNight * nights}</span>
              </div>

              <div className={styles.row}>
                <span>Cleaning fee</span>
                <span>€{b.cleaningFee}</span>
              </div>

              <div className={`${styles.row} ${styles.total}`}>
                <span>Total paid</span>
                <span>€{total}</span>
              </div>
            </div>

            <div className={styles.paymentBox}>
              <div className={styles.paymentLeft}>
                <span>Payment received</span>
                <span>Paid in full</span>
              </div>

              <div className={styles.paymentRight}>
                <span>{b.paymentMethod}</span>
                <span>**** {b.last4}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Manage Reservation</span>
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader}>
                <span>Check-in instructions</span>
                <button className={styles.edit}>Edit</button>
              </div>
              <p>{b.checkinInstructions}</p>
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader}>
                <span>House Rules</span>
                <button className={styles.edit}>Edit</button>
              </div>
              {b.houseRules?.map((rule, i) => (
                <p key={i}>{rule}</p>
              ))}
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader}>
                <span>Cancellation Policy</span>
                <button className={styles.edit}>Edit</button>
              </div>
              <p>{b.cancellationPolicy}</p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Actions</span>
            </div>

            <button
              className={styles.primaryBtn}
              onClick={() =>
                navigate("/hostdashboard/calendar-pricing")
              }
            >
              View in calendar
            </button>

            <button className={styles.secondaryBtn}>
              Download receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostReservationDetails;