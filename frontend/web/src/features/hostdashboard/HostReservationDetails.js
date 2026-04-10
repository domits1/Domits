import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./HostReservationDetails.module.css";
import {
  FiMapPin,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiCalendar,
  FiDownload,
  FiCheckCircle,
  FiHome,
  FiVolumeX,
  FiUsers
} from "react-icons/fi";
import { getGuestBookingPropertyDetails } from "../guestdashboard/services/bookingAPI";

const mockDetails = {
  guestId: 1,
  title: "Sea View Apartment",
  city: "Barcelona",
  country: "Spain",
  image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  arrivaldate: "2026-04-15",
  departuredate: "2026-04-20",
  bookedOn: "2026-03-10",
  guests: 2,
  guestname: "John Doe",
  guestemail: "john@example.com",
  guestphone: "+31611111111",
  specialRequest: "Late check-in requested",
  pricePerNight: 120,
  cleaningFee: 40,
  paymentMethod: "Visa",
  last4: "4242",
  reservationId: "RES123456",
  confirmationCode: "RES123",
  checkinInstructions: "Self check-in with lockbox",
  houseRules: ["No smoking", "No parties"],
  cancellationPolicy: "Free cancellation within 5 days",
  cancellationType: "Flexible"
};

const HostReservationDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [b, setB] = useState(location.state?.booking || null);

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date)) return "";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  useEffect(() => {
    if (b) return;

    const load = async () => {
      try {
        const data = await getGuestBookingPropertyDetails(id);

        if (!data) {
          setB(mockDetails);
          return;
        }

        setB({
          guestId: data?.guestId,
          title: data?.property?.title || mockDetails.title,
          city: data?.propertyLocation?.city || mockDetails.city,
          country: data?.propertyLocation?.country || mockDetails.country,
          image: data?.propertyImages?.[0]?.image || mockDetails.image,

          arrivaldate: data?.arrivalDate || mockDetails.arrivaldate,
          departuredate: data?.departureDate || mockDetails.departuredate,
          bookedOn: data?.createdAt || mockDetails.bookedOn,
          guests: data?.guests || mockDetails.guests,

          guestname: data?.guestName || mockDetails.guestname,
          guestemail: data?.guestEmail || mockDetails.guestemail,
          guestphone: data?.guestPhone || mockDetails.guestphone,

          specialRequest: data?.specialRequest || mockDetails.specialRequest,

          pricePerNight: data?.pricing?.roomRate || mockDetails.pricePerNight,
          cleaningFee: data?.pricing?.cleaning || mockDetails.cleaningFee,

          paymentMethod: data?.payment?.method || mockDetails.paymentMethod,
          last4: data?.payment?.last4 || mockDetails.last4,

          reservationId: data?.bookingId || mockDetails.reservationId,
          confirmationCode:
            data?.bookingId?.slice(0, 6) || mockDetails.confirmationCode,

          checkinInstructions:
            data?.checkIn?.from && data?.checkIn?.till
              ? `${data.checkIn.from} - ${data.checkIn.till}`
              : mockDetails.checkinInstructions,

          houseRules:
            Array.isArray(data?.rules) && data.rules.length > 0
              ? data.rules
              : mockDetails.houseRules,

          cancellationPolicy:
            data?.cancellationPolicy || mockDetails.cancellationPolicy,

          cancellationType:
            data?.cancellationType || mockDetails.cancellationType,
        });
      } catch {
        setB(mockDetails);
      }
    };

    load();
  }, [id, b]);

  if (!b) return <div className={styles.container}>Loading...</div>;

  const nights =
    (new Date(b.departuredate) - new Date(b.arrivaldate)) /
    (1000 * 60 * 60 * 24);

  const total =
    (b.pricePerNight || 0) * nights + (b.cleaningFee || 0);

  const getRuleIcon = (rule) => {
    if (rule.toLowerCase().includes("smoking")) return <FiVolumeX />;
    if (rule.toLowerCase().includes("parties")) return <FiUsers />;
    return <FiHome />;
  };

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        ← Back to reservations
      </button>

      <h1 className={styles.title}>{b.title}</h1>

      <div className={styles.meta}>
        <span className={styles.status}>
          <FiCheckCircle /> Confirmed
        </span>
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

                <p className={styles.dates}>
                  {formatDate(b.arrivaldate)} →{" "}
                  {formatDate(b.departuredate)}
                </p>

                <div className={styles.metaLine}>
                  <span>{nights} nights</span>
                  <span>{b.guests} guests</span>
                </div>

                <p className={styles.bookingDate}>
                  Booked on {formatDate(b.bookedOn)}
                </p>
              </div>
            </div>

            <div className={styles.reservationMeta}>
              <span>Reservation ID: {b.reservationId}</span>
              <span>Confirmation: {b.confirmationCode}</span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.blockHeader}>
                <span>Guest</span>
              </div>

              <button className={styles.secondaryBtnGuest}>
                <FiMessageCircle /> Message guest
              </button>
            </div>

            <div className={styles.guestRow}>
              <div className={styles.avatar}>
                {b.guestname?.charAt(0)}
              </div>

              <div className={styles.guestInfo}>
                <strong>{b.guestname}</strong>

                <div className={styles.guestLine}>
                  <FiMail /> {b.guestemail}
                </div>

                <div className={styles.guestLine}>
                  <FiPhone /> {b.guestphone}
                </div>
              </div>

              {b.specialRequest && (
                <div className={styles.request}>
                  <strong>Special request</strong>
                  <span>{b.specialRequest}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Payment</span>
            </div>

            <div className={styles.paymentWrapper}>
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

                <div className={styles.divider}></div>

                <div className={`${styles.row} ${styles.total}`}>
                  <span>Total paid</span>
                  <span>€{total}</span>
                </div>
              </div>

              <div className={styles.paymentBox}>
                <div className={styles.paymentHeader}>
                  <FiCheckCircle />
                <span>Payment received</span>
              </div>

              <div className={styles.paymentStatus}>
                <span className={styles.paid}>Paid in full on </span>
               <span className={styles.date}>
               {formatDate(b.bookedOn)}
                </span>
              </div>

  <div className={styles.paymentMethod}>
    <span className={styles.paid}>Method</span>
    <span className={styles.date}>
      **** {b.last4} {b.paymentMethod}
    </span>
  </div>
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
              <div className={styles.blockHeader2}>
                <span>Check-in instructions</span>
                <button className={styles.edit}>Edit</button>
              </div>
              <p className={styles.grayBox}>{b.checkinInstructions}</p>
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader2}>
                <span>House Rules</span>
                <button className={styles.edit}>Edit</button>
              </div>

              <div className={styles.grayBox}>
                {b.houseRules?.map((rule, i) => (
                  <div key={i} className={styles.guestLine}>
                    {getRuleIcon(rule)} {rule}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader2}>
                <span>Cancellation Policy</span>
                <button className={styles.edit}>Edit</button>
              </div>

              {b.cancellationType && (
                <span className={styles.policyTag}>
                  {b.cancellationType}
                </span>
              )}

              <p className={styles.grayBox}>
                {b.cancellationPolicy}
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Actions</span>
            </div>

            <button className={styles.primaryBtn}>
              <FiCalendar /> View in calendar
            </button>

           <button className={styles.secondaryActionBtn}>
              <FiDownload /> Download receipt
           </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostReservationDetails;