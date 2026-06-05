import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiHome,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiUsers,
} from "react-icons/fi";
import { MdOutlineSmokeFree } from "react-icons/md";

import { getAccessToken, getCognitoUserId } from "../../services/getAccessToken.js";
import {
  normalizeImageUrl,
  placeholderImage,
  resolvePrimaryAccommodationImageUrl,
} from "../../utils/accommodationImage.js";
import {
  parseCancellationPolicy,
  parseCancellationPolicyString,
  parseHouseRules,
} from "../../utils/policyDisplayUtils.js";
import PulseBarsLoader from "../../components/loaders/PulseBarsLoader.jsx";
import styles from "./HostReservationDetails.module.css";
import {
  persistCalendarFocusContext,
  persistSelectedPropertyId,
} from "./hostcalen/hooks/hostCalendarHelpers.js";
import { PROPERTY_API_BASE } from "./hostproperty/constants.js";
import {
  fetchUserProfileById,
  getEmptyUserProfile,
} from "./services/fetchUserProfileById.js";
import getReservationsFromToken from "./services/getReservationsFromToken.js";

const STATUS_CLASS = {
  PAID: styles.statusPaid,
  AWAITING_PAYMENT: styles.statusAwaiting,
  FAILED: styles.statusFailed,
  DECLINED: styles.statusFailed,
  INQUIRY: styles.statusAwaiting,
};

const STATUS_CONFIG = {
  PAID: { label: "Confirmed", icon: <FiCheckCircle /> },
  AWAITING_PAYMENT: { label: "Awaiting payment", icon: <FiClock /> },
  FAILED: { label: "Failed", icon: <FiAlertCircle /> },
  DECLINED: { label: "Declined", icon: <FiAlertCircle /> },
  INQUIRY: { label: "Request", icon: <FiClock /> },
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
  DECLINED: {
    label: "Payment declined",
    text: "Payment was declined",
    className: styles.failed,
  },
  INQUIRY: {
    label: "Pending request",
    text: "Waiting for host review",
    className: styles.awaiting,
  },
};

const PAYMENT_BOX_CLASS = {
  PAID: styles.paymentBoxPaid,
  AWAITING_PAYMENT: styles.paymentBoxAwaiting,
  FAILED: styles.paymentBoxFailed,
  DECLINED: styles.paymentBoxFailed,
  INQUIRY: styles.paymentBoxAwaiting,
};

const normalizeStatus = (status) => {
  if (!status) return "";

  const normalizedStatus = String(status).toLowerCase();

  if (normalizedStatus === "inquiry") return "INQUIRY";
  if (normalizedStatus === "declined") return "DECLINED";
  if (normalizedStatus.includes("paid")) return "PAID";
  if (normalizedStatus.includes("await")) return "AWAITING_PAYMENT";
  if (normalizedStatus.includes("fail")) return "FAILED";

  return String(status).toUpperCase();
};

const resolveCancellationType = (cancellationPolicy, rules = []) => {
  if (cancellationPolicy) {
    return cancellationPolicy;
  }

  const matchingRule = (rules || []).find(
    (rule) =>
      rule?.rule?.startsWith("CancellationPolicy:") &&
      (rule?.value === true || rule?.value === "true")
  );

  if (matchingRule?.rule) {
    return matchingRule.rule.replace("CancellationPolicy:", "").trim();
  }

  return null;
};

const getPropertiesArray = (data) => {
  if (Array.isArray(data?.response)) {
    return data.response;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
};

const getReservationsArray = (property) => {
  if (Array.isArray(property?.res?.response)) {
    return property.res.response;
  }

  return [];
};

const mapReservations = (data) => {
  const properties = getPropertiesArray(data);

  return properties.flatMap((property) => {
    const reservations = getReservationsArray(property);
    const propertyRules = Array.isArray(property?.rules) ? property.rules : [];

    return reservations.map((reservation) => ({
      property_id: property?.id,
      title: property?.title,
      rate: property?.rate,
      city: property?.city,
      country: property?.country,
      ...reservation,
      status: normalizeStatus(reservation?.status),
      cancellationType: resolveCancellationType(
        reservation?.cancellation_policy,
        propertyRules
      ),
    }));
  });
};

const firstDefined = (...candidates) =>
  candidates.find(
    (candidate) =>
      candidate !== undefined &&
      candidate !== null &&
      !(typeof candidate === "string" && candidate.trim() === "")
  );

const normalizeStringValue = (value) => String(value || "").trim();

const toDisplayValue = (value, fallback = "unavailable") => {
  const normalized = normalizeStringValue(value);
  return normalized || fallback;
};

const getBookingId = (booking) =>
  normalizeStringValue(
    firstDefined(
      booking?.id,
      booking?.ID,
      booking?.bookingId,
      booking?.booking_id
    )
  );

const getPropertyId = (booking) =>
  normalizeStringValue(
    firstDefined(
      booking?.property_id,
      booking?.propertyId,
      booking?.property?.id
    )
  );

const getGuestId = (booking) =>
  normalizeStringValue(
    firstDefined(
      booking?.guestid,
      booking?.guestId,
      booking?.guest_id,
      booking?.GuestID
    )
  );

const buildChannelLabel = (booking) => {
  const rawChannel = normalizeStringValue(
    firstDefined(booking?.channel, booking?.bookingtype, booking?.bookingType, "Direct")
  );

  if (!rawChannel) {
    return "Direct";
  }

  const normalized = rawChannel.toLowerCase();
  if (normalized === rawChannel || rawChannel === rawChannel.toUpperCase()) {
    return rawChannel.charAt(0).toUpperCase() + rawChannel.slice(1).toLowerCase();
  }

  return rawChannel;
};

const resolveReservationImage = ({ booking, propertyDetails }) => {
  const detailImages = Array.isArray(propertyDetails?.images)
    ? propertyDetails.images
    : Array.isArray(propertyDetails?.propertyImages)
      ? propertyDetails.propertyImages
      : [];
  if (detailImages.length > 0) {
    return resolvePrimaryAccommodationImageUrl(detailImages, "thumb");
  }

  const bookingImages = Array.isArray(booking?.images)
    ? booking.images
    : Array.isArray(booking?.property?.images)
      ? booking.property.images
      : [];
  if (bookingImages.length > 0) {
    return resolvePrimaryAccommodationImageUrl(bookingImages, "thumb");
  }

  const fallbackImage = firstDefined(
    booking?.propertyImage,
    booking?.image,
    booking?.property?.coverImage,
    booking?.property?.image
  );

  return fallbackImage ? normalizeImageUrl(fallbackImage) : placeholderImage;
};

const resolveGuestProfileImage = ({ booking, guestProfile }) => {
  const imageCandidate = normalizeStringValue(
    firstDefined(
      booking?.guestProfileImage,
      booking?.guestprofileimage,
      booking?.guestAvatar,
      booking?.guestavatar,
      booking?.guest?.profileImage,
      booking?.guest?.picture,
      guestProfile?.profileImage
    )
  );

  return imageCandidate ? normalizeImageUrl(imageCandidate) : "";
};

const buildCheckInInstructions = ({ booking, propertyDetails }) => {
  const checkInData = propertyDetails?.checkIn || booking?.checkIn || {};
  const checkInWindow = checkInData?.checkIn || {};
  const from = normalizeStringValue(
    firstDefined(
      checkInWindow?.from,
      checkInData?.from,
      booking?.checkinFrom,
      booking?.checkin_from
    )
  );
  const till = normalizeStringValue(
    firstDefined(
      checkInWindow?.till,
      checkInData?.till,
      booking?.checkinTill,
      booking?.checkin_till
    )
  );

  if (from && till) {
    return `${from} - ${till}`;
  }

  if (from || till) {
    return from || till;
  }

  return "No check-in instructions";
};

const buildHouseRuleLabels = (propertyDetails) => {
  const parsedRules = parseHouseRules(
    propertyDetails?.rules || [],
    propertyDetails?.property || {}
  );

  const labels = parsedRules
    .map((ruleItem) => {
      const label = normalizeStringValue(ruleItem?.label);
      if (!label) {
        return "";
      }

      if (typeof ruleItem?.value === "boolean") {
        return ruleItem.value
          ? label
          : `No ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
      }

      const ruleValue = normalizeStringValue(ruleItem?.value);
      return ruleValue ? `${label}: ${ruleValue}` : label;
    })
    .filter(Boolean);

  return labels.length > 0 ? labels : ["No house rules specified"];
};

const resolveActiveCancellationPolicy = ({ booking, propertyDetails }) => {
  const bookingPolicyCandidate = normalizeStringValue(
    firstDefined(
      booking?.cancellationPolicy,
      booking?.cancellation_policy,
      booking?.cancellationType
    )
  );

  const parsedPropertyPolicy = propertyDetails?.cancellationPolicy
    ? parseCancellationPolicyString(propertyDetails.cancellationPolicy)
    : parseCancellationPolicy(propertyDetails?.rules || []);

  const parsedBookingPolicy = bookingPolicyCandidate
    ? parseCancellationPolicyString(bookingPolicyCandidate)
    : null;

  const activePolicy =
    parsedPropertyPolicy ||
    parsedBookingPolicy ||
    parseCancellationPolicyString("");

  return {
    type: activePolicy?.type || "Not specified",
    summary:
      activePolicy?.summary || "No cancellation policy selected.",
  };
};

const fetchHostPropertyDetails = async (propertyId, token) => {
  if (!propertyId || !token) {
    return null;
  }

  const response = await fetch(
    `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`,
    {
      method: "GET",
      headers: {
        Authorization: token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Could not load listing details (${response.status}).`);
  }

  return response.json();
};

const buildReservationDetailsModel = ({
  booking,
  propertyDetails,
  guestProfile,
}) => {
  const propertyId = getPropertyId(booking);
  const guestId = getGuestId(booking);
  const reservationId = normalizeStringValue(
    firstDefined(
      booking?.reservationId,
      booking?.bookingId,
      booking?.booking_id,
      booking?.id,
      booking?.ID
    )
  );
  const location =
    propertyDetails?.location ||
    propertyDetails?.propertyLocation ||
    booking?.propertyLocation ||
    {};
  const cancellationPolicy = resolveActiveCancellationPolicy({
    booking,
    propertyDetails,
  });
  const bookingPolicyCandidate = normalizeStringValue(
    firstDefined(
      booking?.cancellationPolicy,
      booking?.cancellation_policy,
      booking?.cancellationType
    )
  );
  const hasCheckInData = Boolean(
    normalizeStringValue(
      firstDefined(
        propertyDetails?.checkIn?.checkIn?.from,
        propertyDetails?.checkIn?.from,
        booking?.checkinFrom,
        booking?.checkin_from,
        propertyDetails?.checkIn?.checkIn?.till,
        propertyDetails?.checkIn?.till,
        booking?.checkinTill,
        booking?.checkin_till
      )
    )
  );
  const resolvedHouseRules = propertyDetails
    ? buildHouseRuleLabels(propertyDetails)
    : Array.isArray(booking?.houseRules)
      ? booking.houseRules.filter(Boolean)
      : [];
  const guestName =
    normalizeStringValue(
      firstDefined(
        booking?.guestname,
        booking?.guestName,
        guestProfile?.givenName
      )
    ) || "Guest";
  const bookingGuestEmail = firstDefined(booking?.guestemail, booking?.guestEmail);
  const bookingGuestPhone = firstDefined(booking?.guestphone, booking?.guestPhone);
  const isGuestProfilePending = guestProfile === null;

  return {
    ...booking,
    propertyId,
    guestId,
    channel: buildChannelLabel(booking),
    status: normalizeStatus(booking?.status),
    title:
      normalizeStringValue(
        firstDefined(
          propertyDetails?.property?.title,
          propertyDetails?.title,
          booking?.title,
          booking?.Title
        )
      ) || "Untitled property",
    city: normalizeStringValue(firstDefined(location?.city, booking?.city)),
    country: normalizeStringValue(
      firstDefined(location?.country, booking?.country)
    ),
    image: resolveReservationImage({ booking, propertyDetails }),
    arrivaldate: firstDefined(
      booking?.arrivaldate,
      booking?.arrivalDate
    ),
    departuredate: firstDefined(
      booking?.departuredate,
      booking?.departureDate
    ),
    bookedOn: firstDefined(
      booking?.bookedOn,
      booking?.createdAt,
      booking?.createdat
    ),
    guests: firstDefined(booking?.guests, booking?.guestCount, 0),
    guestname: guestName,
    guestProfileImage: resolveGuestProfileImage({ booking, guestProfile }),
    guestemail: bookingGuestEmail
      ? toDisplayValue(bookingGuestEmail)
      : isGuestProfilePending
      ? ""
      : toDisplayValue(
          firstDefined(guestProfile?.email)
        ),
    guestphone: bookingGuestPhone
      ? toDisplayValue(bookingGuestPhone)
      : isGuestProfilePending
      ? ""
      : toDisplayValue(
          firstDefined(guestProfile?.phoneNumber)
        ),
    specialRequest: normalizeStringValue(
      firstDefined(booking?.specialRequest, booking?.special_request)
    ),
    pricePerNight:
      Number(
        firstDefined(
          booking?.pricePerNight,
          booking?.rate,
          propertyDetails?.pricing?.roomRate,
          propertyDetails?.pricing?.roomrate,
          0
        )
      ) || 0,
    cleaningFee:
      Number(
        firstDefined(
          booking?.cleaningFee,
          propertyDetails?.pricing?.cleaning,
          0
        )
      ) || 0,
    paymentMethod:
      normalizeStringValue(
        firstDefined(booking?.paymentMethod, booking?.payment?.method)
      ) || "Card",
    last4:
      normalizeStringValue(
        firstDefined(booking?.last4, booking?.payment?.last4)
      ) || "****",
    reservationId: reservationId || "unavailable",
    confirmationCode: reservationId ? reservationId.slice(0, 6) : "unavailable",
    checkinInstructions: hasCheckInData
      ? buildCheckInInstructions({ booking, propertyDetails })
      : "",
    houseRules: resolvedHouseRules,
    cancellationPolicy:
      propertyDetails || bookingPolicyCandidate ? cancellationPolicy.summary : "",
    cancellationType:
      propertyDetails || bookingPolicyCandidate ? cancellationPolicy.type : "",
  };
};

const EMPTY_RESERVATION_DETAILS = Object.freeze({
  propertyId: "",
  guestId: "",
  title: "Reservation details",
  channel: "Direct",
  status: "",
  image: placeholderImage,
  city: "",
  country: "",
  arrivaldate: "",
  departuredate: "",
  bookedOn: "",
  guests: 0,
  guestname: "Guest",
  guestProfileImage: "",
  guestemail: "",
  guestphone: "",
  specialRequest: "",
  pricePerNight: 0,
  cleaningFee: 0,
  paymentMethod: "Card",
  last4: "****",
  reservationId: "",
  confirmationCode: "",
  checkinInstructions: "",
  houseRules: [],
  cancellationPolicy: "",
  cancellationType: "",
});

const formatCurrency = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "0.00";
  }

  return numericValue.toFixed(2);
};

const getRuleIcon = (rule) => {
  if (!rule) return <FiHome />;

  const normalizedRule = String(rule).toLowerCase();
  if (normalizedRule.includes("smoking")) return <MdOutlineSmokeFree />;
  if (normalizedRule.includes("parties")) return <FiUsers />;

  return <FiHome />;
};

const HostReservationDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const formatDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleViewInCalendar = () => {
    const hostId = normalizeStringValue(getCognitoUserId());
    const propertyId = normalizeStringValue(b?.propertyId || b?.property_id);
    const arrivalDate = firstDefined(b?.arrivaldate, b?.arrivalDate);
    const calendarContext = {
      bookingId: getBookingId(b),
      propertyId,
      arrivalDate,
      departureDate: firstDefined(b?.departuredate, b?.departureDate),
    };

    if (hostId && propertyId) {
      persistSelectedPropertyId(hostId, propertyId);
    }
    if (hostId) {
      persistCalendarFocusContext(hostId, calendarContext);
    }

    navigate("/hostdashboard/calendar-pricing", {
      state: {
        calendarContext,
      },
    });
  };

  const handleMessageGuest = () => {
    const guestId = normalizeStringValue(b?.guestId || b?.guestid);
    const propertyId = normalizeStringValue(b?.propertyId || b?.property_id);

    navigate("/hostdashboard/messages", {
      state: {
        messageContext: {
          contactId: guestId || null,
          contactName: b?.guestname || null,
          propertyId: propertyId || null,
          propertyTitle: b?.title || null,
          accoImage: b?.image || null,
          platform: "DOMITS",
        },
      },
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadReservation = async () => {
      setLoading(true);
      setError(false);
      setB(null);

      try {
        const authToken = getAccessToken();
        let booking = location.state?.booking || null;

        if (!booking) {
          if (!authToken) {
            throw new Error("Could not load reservation without an active host session.");
          }

          const reservationData = await getReservationsFromToken(authToken);
          booking = mapReservations(reservationData).find(
            (candidateBooking) => getBookingId(candidateBooking) === normalizeStringValue(id)
          );
        }

        if (!booking) {
          throw new Error("Reservation not found.");
        }

        const propertyId = getPropertyId(booking);
        const guestId = getGuestId(booking);
        const baseReservationModel = buildReservationDetailsModel({
          booking,
          propertyDetails: null,
          guestProfile: null,
        });

        if (isMounted) {
          setB(baseReservationModel);
        }

        const [propertyDetailsResult, guestProfileResult] =
          await Promise.allSettled([
            authToken && propertyId
              ? fetchHostPropertyDetails(propertyId, authToken)
              : Promise.resolve(null),
            guestId
              ? fetchUserProfileById(guestId)
              : Promise.resolve(getEmptyUserProfile(guestId)),
          ]);

        if (!isMounted) {
          return;
        }

        const propertyDetails =
          propertyDetailsResult.status === "fulfilled"
            ? propertyDetailsResult.value
            : null;
        const guestProfile =
          guestProfileResult.status === "fulfilled"
            ? guestProfileResult.value
            : getEmptyUserProfile(guestId);

        setB(
          buildReservationDetailsModel({
            booking,
            propertyDetails,
            guestProfile,
          })
        );
      } catch (loadError) {
        console.error("Failed to load reservation details:", loadError);

        if (!isMounted) {
          return;
        }

        setB(null);
        setError(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadReservation();

    return () => {
      isMounted = false;
    };
  }, [id, location.state?.booking]);

  if (error && !b) {
    return <div className={styles.container}>Failed to load reservation.</div>;
  }

  if (!loading && !b) {
    return <div className={styles.container}>No reservation found.</div>;
  }

  const reservation = b || EMPTY_RESERVATION_DETAILS;
  const isShellLoading = loading && !b;
  const hasReservationData = Boolean(b);
  const nights = Math.max(
    0,
    Math.round(
      (new Date(reservation.departuredate) - new Date(reservation.arrivaldate)) /
        (1000 * 60 * 60 * 24)
    )
  );
  const total = reservation.pricePerNight * nights + reservation.cleaningFee;
  const locationLabel =
    [reservation.city, reservation.country].filter(Boolean).join(", ") ||
    (isShellLoading ? "Loading location..." : "Location unavailable");
  const bookedOnLabel = formatDate(reservation.bookedOn) || "";
  const paymentDateLabel = formatDate(reservation.bookedOn) || "";
  const paymentMethodLabel =
    !hasReservationData
      ? "Loading..."
      : reservation.last4 && reservation.last4 !== "****"
      ? `**** ${reservation.last4} ${reservation.paymentMethod}`
      : reservation.paymentMethod;

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <FiArrowLeft />
        Back to reservations
      </button>

      <h1 className={styles.title}>{reservation.title}</h1>

      <div className={styles.meta}>
        <span className={`${styles.status} ${STATUS_CLASS[reservation.status] || ""}`}>
          {STATUS_CONFIG[reservation.status]?.icon}
          {STATUS_CONFIG[reservation.status]?.label || (isShellLoading ? "Loading" : "Reservation")}
        </span>

        <div className={styles.channel}>
          {isShellLoading ? (
            <PulseBarsLoader inline message="Loading reservation summary..." className={styles.inlineLoader} />
          ) : (
            <>Booked via {reservation.channel || "Direct"}</>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Property</span>
            </div>

            <div className={styles.property}>
              <img
                src={reservation.image || placeholderImage}
                className={styles.image}
                alt={reservation.title || "Property image"}
                onError={(event) => {
                  event.currentTarget.src = placeholderImage;
                }}
              />

              <div className={styles.propertyDetails}>
                <h4>{reservation.title}</h4>

                <p className={styles.location}>
                  <FiMapPin /> {locationLabel}
                </p>

                <p className={styles.dates}>
                  {formatDate(reservation.arrivaldate) || (isShellLoading ? "Loading..." : "unavailable")} {"\u2192"}{" "}
                  {formatDate(reservation.departuredate) || (isShellLoading ? "Loading..." : "unavailable")}
                </p>

                {reservation.checkinInstructions ? (
                  <p>Check-in: {reservation.checkinInstructions}</p>
                ) : isShellLoading ? (
                  <PulseBarsLoader
                    inline
                    message="Loading reservation details..."
                    className={styles.inlineLoader}
                  />
                ) : null}

                <div className={styles.metaLine}>
                  <span>{nights} nights</span>
                  <span>{reservation.guests} guests</span>
                </div>

                <p className={styles.bookingDate}>
                  {bookedOnLabel ? `Booked on ${bookedOnLabel}` : isShellLoading ? "Booked on loading..." : "Booked on unavailable"}
                </p>
              </div>
            </div>

            <div className={styles.reservationMeta}>
              <span>
                Reservation ID: {reservation.reservationId || (isShellLoading ? "Loading..." : "unavailable")}
              </span>
              <span>
                Confirmation: {reservation.confirmationCode || (isShellLoading ? "Loading..." : "unavailable")}
              </span>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.blockHeader}>
                <span>Guest</span>
              </div>

              <button
                className={styles.secondaryBtnGuest}
                onClick={handleMessageGuest}
                disabled={!hasReservationData}
              >
                <FiMessageCircle /> Message guest
              </button>
            </div>

            <div className={styles.guestRow}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  {(reservation.guestname || "G").charAt(0).toUpperCase()}
                </div>
                {reservation.guestProfileImage ? (
                  <img
                    src={reservation.guestProfileImage}
                    alt={reservation.guestname || "Guest"}
                    className={styles.avatarImage}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
              </div>

              <div className={styles.guestInfo}>
                <strong>{reservation.guestname}</strong>

                <div className={styles.guestLine}>
                  <FiMail />{" "}
                  {reservation.guestemail ? (
                    reservation.guestemail
                  ) : loading ? (
                    <PulseBarsLoader
                      inline
                      message="Loading guest email..."
                      className={styles.inlineLoader}
                    />
                  ) : (
                    "unavailable"
                  )}
                </div>

                <div className={styles.guestLine}>
                  <FiPhone />{" "}
                  {reservation.guestphone ? (
                    reservation.guestphone
                  ) : loading ? (
                    <PulseBarsLoader
                      inline
                      message="Loading guest phone..."
                      className={styles.inlineLoader}
                    />
                  ) : (
                    "unavailable"
                  )}
                </div>
              </div>

              {reservation.specialRequest ? (
                <div className={styles.request}>
                  <strong>Special request</strong>
                  <span>{reservation.specialRequest}</span>
                </div>
              ) : null}
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
                    {"\u20AC"}
                    {formatCurrency(reservation.pricePerNight)} x {nights} nights
                  </span>
                  <span>
                    {"\u20AC"}
                    {formatCurrency(reservation.pricePerNight * nights)}
                  </span>
                </div>

                <div className={styles.row}>
                  <span>Cleaning fee</span>
                  <span>
                    {"\u20AC"}
                    {formatCurrency(reservation.cleaningFee)}
                  </span>
                </div>

                <div className={styles.divider}></div>

                <div className={`${styles.row} ${styles.total}`}>
                  <span>Total paid</span>
                  <span>
                    {"\u20AC"}
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <div
                className={`${styles.paymentBox} ${
                  PAYMENT_BOX_CLASS[reservation.status] || ""
                }`}
              >
                <div className={styles.paymentHeader}>
                  <FiCheckCircle />
                  <span>
                    {PAYMENT_STATUS_CONFIG[reservation.status]?.label || (isShellLoading ? "Loading payment" : "Payment")}
                  </span>
                </div>

                <div className={styles.paymentStatus}>
                  <span className={PAYMENT_STATUS_CONFIG[reservation.status]?.className}>
                    {PAYMENT_STATUS_CONFIG[reservation.status]?.text || (isShellLoading ? "Loading payment status" : "Payment status unavailable")}
                  </span>
                  <span className={styles.date}>{paymentDateLabel || (isShellLoading ? "Loading..." : "unavailable")}</span>
                </div>

                <div className={styles.paymentMethod}>
                  <span className={PAYMENT_STATUS_CONFIG[reservation.status]?.className}>
                    Method
                  </span>
                  <span className={styles.date}>{paymentMethodLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Reservation Info</span>
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader2}>
                <span>Check-in instructions</span>
              </div>

              <div className={styles.grayBox}>
                {reservation.checkinInstructions ? (
                  reservation.checkinInstructions
                ) : loading ? (
                  <PulseBarsLoader
                    inline
                    message="Loading check-in instructions..."
                    className={styles.inlineLoader}
                  />
                ) : (
                  "No check-in instructions"
                )}
              </div>
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader2}>
                <span>House Rules</span>
              </div>

              <div className={styles.grayBox}>
                {reservation.houseRules?.length > 0 ? (
                  reservation.houseRules.map((rule) => (
                    <div key={rule} className={styles.guestLine}>
                      {getRuleIcon(rule)} {rule}
                    </div>
                  ))
                ) : loading ? (
                  <PulseBarsLoader
                    inline
                    message="Loading house rules..."
                    className={styles.inlineLoader}
                  />
                ) : (
                  <div className={styles.guestLine}>
                    <FiHome /> No house rules specified
                  </div>
                )}
              </div>
            </div>

            <div className={styles.block}>
              <div className={styles.blockHeader2}>
                <span>Cancellation Policy</span>
              </div>

              <>
                {reservation.cancellationType ? (
                  <span className={styles.policyTag}>{reservation.cancellationType}</span>
                ) : null}
                <div className={styles.grayBox}>
                  {reservation.cancellationPolicy ? (
                    reservation.cancellationPolicy
                  ) : loading ? (
                    <PulseBarsLoader
                      inline
                      message="Loading cancellation policy..."
                      className={styles.inlineLoader}
                    />
                  ) : (
                    "No cancellation policy selected."
                  )}
                </div>
              </>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.blockHeader}>
              <span>Actions</span>
            </div>

            <button
              className={styles.primaryBtn}
              onClick={handleViewInCalendar}
              disabled={!hasReservationData}
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
