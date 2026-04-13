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
  FiUsers,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";
import { getGuestBookingPropertyDetails } from "../guestdashboard/services/bookingAPI";

const HostReservationDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [b, setB] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({});

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date)) return "";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const POLICY_TYPES = {
    Flexible: "Free cancellation up to 24 hours before check-in.",
    Moderate: "Free cancellation up to 5 days before check-in.",
    Strict: "No free cancellation after booking.",
  };

  const STATUS_CLASS = {
    PAID: styles.statusPaid,
    AWAITING_PAYMENT: styles.statusAwaiting,
    FAILED: styles.statusFailed,
  };

  const STATUS_CONFIG = {
    PAID: { label: "Confirmed", icon: <FiCheckCircle /> },
    AWAITING_PAYMENT: { label: "Awaiting payment", icon: <FiClock /> },
    FAILED: { label: "Failed", icon: <FiAlertCircle /> },
  };

  const PAYMENT_STATUS_CONFIG = {
    PAID: {
      label: "Payment received",
      text: "Paid in full on",
      className: styles.paid,
    },
    AWAITING_PAYMENT: {
      label: "Awaiting payment",
      text: "Payment pending",
      className: styles.awaiting,
    },
    FAILED: {
      label: "Payment failed",
      text: "Payment was not successful",
      className: styles.failed,
    },
  };

  const PAYMENT_BOX_CLASS = {
    PAID: styles.paymentBoxPaid,
    AWAITING_PAYMENT: styles.paymentBoxAwaiting,
    FAILED: styles.paymentBoxFailed,
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setFormData({ ...b });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "cancellationType") {
      setFormData((prev) => ({
        ...prev,
        cancellationType: value,
        cancellationPolicy: POLICY_TYPES[value],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSave = () => {
    setB((prev) => ({
      ...prev,
      ...formData,
    }));
    setEditingSection(null);
  };

  const handleCancel = () => {
    setEditingSection(null);
  };

  useEffect(() => {
    if (location.state?.booking) return;

    const load = async () => {
      try {
        setLoading(true);
        const data = await getGuestBookingPropertyDetails(id);

        if (!data) {
          setError(true);
          return;
        }

        setB({
          guestId: data?.guestId,
          channel: data?.channel,
          status: data?.status,
          title: data?.property?.title,
          city: data?.propertyLocation?.city,
          country: data?.propertyLocation?.country,
          image: data?.propertyImages?.[0]?.image,
          arrivaldate: data?.arrivalDate,
          departuredate: data?.departureDate,
          bookedOn: data?.createdAt,
          guests: data?.guests,
          guestname: data?.guestName,
          guestemail: data?.guestEmail,
          guestphone: data?.guestPhone,
          specialRequest: data?.specialRequest || "",
          pricePerNight: data?.pricing?.roomRate,
          cleaningFee: data?.pricing?.cleaning,
          paymentMethod: data?.payment?.method || "Card",
          last4: data?.payment?.last4 || "****",
          reservationId: data?.bookingId,
          confirmationCode: data?.bookingId?.slice(0, 6),
          checkinInstructions:
            data?.checkIn?.from && data?.checkIn?.till
              ? `${data.checkIn.from} - ${data.checkIn.till}`
              : "No check-in instructions",
          houseRules:
            Array.isArray(data?.rules) && data.rules.length > 0
              ? data.rules
              : ["No house rules specified"],
          cancellationPolicy: data?.cancellationPolicy,
          cancellationType: data?.cancellationType,
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, location.state]);

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}>Failed to load reservation.</div>;
  if (!b) return <div className={styles.container}>No reservation found.</div>;

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
        <span className={`${styles.status} ${STATUS_CLASS[b.status] || ""}`}>
          {STATUS_CONFIG[b.status]?.icon}
          {STATUS_CONFIG[b.status]?.label}
        </span>

        <span className={styles.channel}>
          Booked via {b.channel}
        </span>
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

                <p>Check-in: {b.checkinInstructions}</p>

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

              <div className={`${styles.paymentBox} ${PAYMENT_BOX_CLASS[b.status] || ""}`}>
                <div className={styles.paymentHeader}>
                  <FiCheckCircle />
                  <span>
                    {PAYMENT_STATUS_CONFIG[b.status]?.label || "Payment"}
                  </span>
                </div>

                <div className={styles.paymentStatus}>
                  <span className={PAYMENT_STATUS_CONFIG[b.status]?.className}>
                    {PAYMENT_STATUS_CONFIG[b.status]?.text}
                  </span>
                  <span className={styles.date}>
                    {formatDate(b.bookedOn)}
                  </span>
                </div>

                <div className={styles.paymentMethod}>
                  <span className={PAYMENT_STATUS_CONFIG[b.status]?.className}>
                    Method
                  </span>
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
                <button onClick={() => handleEdit("checkin")} className={styles.edit}>
                  Edit
                </button>
              </div>

              {editingSection === "checkin" ? (
                <>
                  <input
                    name="checkinInstructions"
                    value={formData.checkinInstructions || ""}
                    onChange={handleChange}
                  />
                  <button onClick={handleSave}>Save</button>
                  <button onClick={handleCancel}>Cancel</button>
                </>
              ) : (
                <p className={styles.grayBox}>{b.checkinInstructions}</p>
              )}
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader2}>
                <span>House Rules</span>
                <button onClick={() => handleEdit("rules")} className={styles.edit}>
                  Edit
                </button>
              </div>

              {editingSection === "rules" ? (
                <>
                  <textarea
                    value={(formData.houseRules || []).join("\n")}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        houseRules: e.target.value.split("\n"),
                      })
                    }
                  />
                  <button onClick={handleSave}>Save</button>
                  <button onClick={handleCancel}>Cancel</button>
                </>
              ) : (
                <div className={styles.grayBox}>
                  {b.houseRules?.map((rule, i) => (
                    <div key={i} className={styles.guestLine}>
                      {getRuleIcon(rule)} {rule}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader2}>
                <span>Cancellation Policy</span>
                <button onClick={() => handleEdit("policy")} className={styles.edit}>
                  Edit
                </button>
              </div>

              {editingSection === "policy" ? (
                <>
                  <select
                    name="cancellationType"
                    value={formData.cancellationType || ""}
                    onChange={handleChange}
                  >
                    {Object.keys(POLICY_TYPES).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  <p className={styles.grayBox}>
                    {formData.cancellationPolicy}
                  </p>

                  <button onClick={handleSave}>Save</button>
                  <button onClick={handleCancel}>Cancel</button>
                </>
              ) : (
                <>
                  {b.cancellationType && (
                    <span className={styles.policyTag}>
                      {b.cancellationType}
                    </span>
                  )}
                  <p className={styles.grayBox}>{b.cancellationPolicy}</p>
                </>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Actions</span>
            </div>

            <button
              className={styles.primaryBtn}
              onClick={() => navigate("/hostdashboard/calendar-pricing")}
            >
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