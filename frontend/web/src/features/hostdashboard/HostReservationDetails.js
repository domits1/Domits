import React, { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
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
import { toast } from "react-toastify";

import { LanguageContext } from "../../context/LanguageContext";
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
import downloadReservationReceiptPdf from "./services/downloadReservationReceiptPdf.js";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import { updateInquiryStatus } from "./services/reservationService.js";
import hostReservationDetailsTranslations from "./translations/hostReservationDetailsTranslations.js";

const STATUS_CLASS = {
  PAID: styles.statusPaid,
  AWAITING_PAYMENT: styles.statusAwaiting,
  FAILED: styles.statusFailed,
  DECLINED: styles.statusFailed,
  INQUIRY: styles.statusAwaiting,
};

const PAYMENT_BOX_CLASS = {
  PAID: styles.paymentBoxPaid,
  AWAITING_PAYMENT: styles.paymentBoxAwaiting,
  FAILED: styles.paymentBoxFailed,
  DECLINED: styles.paymentBoxFailed,
  INQUIRY: styles.paymentBoxAwaiting,
};

const RECEIPT_STATUS_LABELS = {
  PAID: "Confirmed",
  AWAITING_PAYMENT: "Awaiting payment",
  FAILED: "Failed",
  DECLINED: "Declined",
  INQUIRY: "Request",
};

const RECEIPT_PAYMENT_STATUS_LABELS = {
  PAID: "Payment received",
  AWAITING_PAYMENT: "Awaiting payment",
  FAILED: "Payment failed",
  DECLINED: "Payment declined",
  INQUIRY: "Pending request",
};

const DEFAULT_CHANNEL = "Direct";
const DEFAULT_PAYMENT_METHOD = "Card";
const DEFAULT_LAST4 = "****";

const getStatusConfig = (t) => ({
  PAID: { label: t.status.PAID, icon: <FiCheckCircle /> },
  AWAITING_PAYMENT: { label: t.status.AWAITING_PAYMENT, icon: <FiClock /> },
  FAILED: { label: t.status.FAILED, icon: <FiAlertCircle /> },
  DECLINED: { label: t.status.DECLINED, icon: <FiAlertCircle /> },
  INQUIRY: { label: t.status.INQUIRY, icon: <FiClock /> },
});

const getPaymentStatusConfig = (t) => ({
  PAID: {
    label: t.paymentStatus.PAID.label,
    text: t.paymentStatus.PAID.text,
    className: styles.paid,
  },
  AWAITING_PAYMENT: {
    label: t.paymentStatus.AWAITING_PAYMENT.label,
    text: t.paymentStatus.AWAITING_PAYMENT.text,
    className: styles.awaiting,
  },
  FAILED: {
    label: t.paymentStatus.FAILED.label,
    text: t.paymentStatus.FAILED.text,
    className: styles.failed,
  },
  DECLINED: {
    label: t.paymentStatus.DECLINED.label,
    text: t.paymentStatus.DECLINED.text,
    className: styles.failed,
  },
  INQUIRY: {
    label: t.paymentStatus.INQUIRY.label,
    text: t.paymentStatus.INQUIRY.text,
    className: styles.awaiting,
  },
});

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

const isOverlappingInquiry = (candidateBooking, targetBooking) => {
  if (!candidateBooking || !targetBooking) {
    return false;
  }

  return (
    candidateBooking.id !== targetBooking.id &&
    candidateBooking.status === "INQUIRY" &&
    getPropertyId(candidateBooking) === getPropertyId(targetBooking) &&
    candidateBooking.arrivaldate < targetBooking.departuredate &&
    candidateBooking.departuredate > targetBooking.arrivaldate
  );
};

const firstDefined = (...candidates) =>
  candidates.find(
    (candidate) =>
      candidate !== undefined &&
      candidate !== null &&
      !(typeof candidate === "string" && candidate.trim() === "")
  );

const firstNonEmptyArray = (...candidates) =>
  candidates.find((candidate) => Array.isArray(candidate) && candidate.length > 0) || [];

const normalizeStringValue = (value) => String(value || "").trim();

const toDisplayValue = (value, fallback = "") => {
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
    firstDefined(
      booking?.channel,
      booking?.bookingtype,
      booking?.bookingType,
      DEFAULT_CHANNEL
    )
  );

  if (!rawChannel) {
    return DEFAULT_CHANNEL;
  }

  const normalized = rawChannel.toLowerCase();
  if (normalized === rawChannel || rawChannel === rawChannel.toUpperCase()) {
    return rawChannel.charAt(0).toUpperCase() + rawChannel.slice(1).toLowerCase();
  }

  return rawChannel;
};

const resolveReservationImage = ({ booking, propertyDetails }) => {
  const detailImages = firstNonEmptyArray(
    propertyDetails?.images,
    propertyDetails?.propertyImages
  );
  if (detailImages.length > 0) {
    return resolvePrimaryAccommodationImageUrl(detailImages, "thumb");
  }

  const bookingImages = firstNonEmptyArray(
    booking?.images,
    booking?.property?.images
  );
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

  return "";
};

const buildHouseRuleLabels = (propertyDetails) => {
  const parsedRules = parseHouseRules(
    propertyDetails?.rules || [],
    propertyDetails?.property || {}
  );

  return parsedRules
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
};

const resolveHouseRules = (booking, propertyDetails) => {
  if (propertyDetails) {
    return buildHouseRuleLabels(propertyDetails);
  }

  if (Array.isArray(booking?.houseRules)) {
    return booking.houseRules.filter(Boolean);
  }

  return [];
};

const resolveGuestContactValue = ({
  bookingValue,
  profileValue,
  isGuestProfilePending,
}) => {
  if (bookingValue) {
    return toDisplayValue(bookingValue);
  }

  if (isGuestProfilePending) {
    return "";
  }

  return toDisplayValue(profileValue);
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

  const activePolicy = parsedPropertyPolicy || parsedBookingPolicy;

  return {
    type: normalizeStringValue(activePolicy?.type),
    summary: normalizeStringValue(activePolicy?.summary),
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

const hasCheckInInstructionsData = ({ booking, propertyDetails }) =>
  Boolean(
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
  const checkInAvailable = hasCheckInInstructionsData({ booking, propertyDetails });
  const bookingGuestEmail = firstDefined(booking?.guestemail, booking?.guestEmail);
  const bookingGuestPhone = firstDefined(booking?.guestphone, booking?.guestPhone);
  const isGuestProfilePending = guestProfile === null;

  return {
    ...booking,
    propertyId,
    guestId,
    channel: buildChannelLabel(booking),
    status: normalizeStatus(booking?.status),
    title: normalizeStringValue(
      firstDefined(
        propertyDetails?.property?.title,
        propertyDetails?.title,
        booking?.title,
        booking?.Title
      )
    ),
    city: normalizeStringValue(firstDefined(location?.city, booking?.city)),
    country: normalizeStringValue(firstDefined(location?.country, booking?.country)),
    image: resolveReservationImage({ booking, propertyDetails }),
    arrivaldate: firstDefined(booking?.arrivaldate, booking?.arrivalDate),
    departuredate: firstDefined(booking?.departuredate, booking?.departureDate),
    bookedOn: firstDefined(
      booking?.bookedOn,
      booking?.createdAt,
      booking?.createdat
    ),
    guests: firstDefined(booking?.guests, booking?.guestCount, 0),
    guestname: normalizeStringValue(
      firstDefined(
        booking?.guestname,
        booking?.guestName,
        guestProfile?.givenName
      )
    ),
    guestProfileImage: resolveGuestProfileImage({ booking, guestProfile }),
    guestemail: resolveGuestContactValue({
      bookingValue: bookingGuestEmail,
      profileValue: firstDefined(guestProfile?.email),
      isGuestProfilePending,
    }),
    guestphone: resolveGuestContactValue({
      bookingValue: bookingGuestPhone,
      profileValue: firstDefined(guestProfile?.phoneNumber),
      isGuestProfilePending,
    }),
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
      ) || DEFAULT_PAYMENT_METHOD,
    last4:
      normalizeStringValue(
        firstDefined(booking?.last4, booking?.payment?.last4)
      ) || DEFAULT_LAST4,
    reservationId,
    confirmationCode: reservationId ? reservationId.slice(0, 6) : "",
    checkinInstructions: checkInAvailable
      ? buildCheckInInstructions({ booking, propertyDetails })
      : "",
    houseRules: resolveHouseRules(booking, propertyDetails),
    cancellationPolicy: cancellationPolicy.summary,
    cancellationType: cancellationPolicy.type,
  };
};

const EMPTY_RESERVATION_DETAILS = Object.freeze({
  propertyId: "",
  guestId: "",
  title: "",
  channel: "",
  status: "",
  image: placeholderImage,
  city: "",
  country: "",
  arrivaldate: "",
  departuredate: "",
  bookedOn: "",
  guests: 0,
  guestname: "",
  guestProfileImage: "",
  guestemail: "",
  guestphone: "",
  specialRequest: "",
  pricePerNight: 0,
  cleaningFee: 0,
  paymentMethod: DEFAULT_PAYMENT_METHOD,
  last4: DEFAULT_LAST4,
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

const formatShortDate = (dateValue) => {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
};

const getRuleIcon = (rule) => {
  if (!rule) return <FiHome />;

  const normalizedRule = String(rule).toLowerCase();
  if (normalizedRule.includes("smoking")) return <MdOutlineSmokeFree />;
  if (normalizedRule.includes("parties")) return <FiUsers />;

  return <FiHome />;
};

const calculateReservationNights = (arrivalDate, departureDate) =>
  Math.max(
    0,
    Math.round(
      (new Date(departureDate) - new Date(arrivalDate)) / (1000 * 60 * 60 * 24)
    )
  );

const buildMaskedPaymentMethodLabel = (reservation) => {
  if (reservation.last4 && reservation.last4 !== DEFAULT_LAST4) {
    return `**** ${reservation.last4} ${reservation.paymentMethod}`;
  }

  return reservation.paymentMethod;
};

const buildCountLabel = (count, singular, plural) => {
  const normalizedCount = Number(count || 0);
  const label = normalizedCount === 1 ? singular : plural;
  return `${normalizedCount} ${label}`;
};

const formatTemplate = (template, values) =>
  Object.entries(values).reduce(
    (currentText, [key, value]) =>
      currentText.replaceAll(`{${key}}`, String(value)),
    String(template || "")
  );

const hasDisplayValue = (value) => normalizeStringValue(value) !== "";

const buildLoadingAwareText = (value, isLoading, loadingValue, emptyValue) => {
  if (hasDisplayValue(value)) {
    return value;
  }

  return isLoading ? loadingValue : emptyValue;
};

const buildLocationLabel = (reservation, isShellLoading, t) =>
  [reservation.city, reservation.country].filter(Boolean).join(", ") ||
  (isShellLoading ? t.labels.loadingLocation : t.labels.locationUnavailable);

const buildBookedOnText = (bookedOn, isShellLoading, t) => {
  const value = buildLoadingAwareText(
    formatShortDate(bookedOn),
    isShellLoading,
    t.labels.loadingValue,
    t.labels.unavailable
  );

  return `${t.labels.bookedOn} ${value}`;
};

const buildReservationViewModel = ({
  reservation,
  hasReservationData,
  isShellLoading,
  t,
}) => {
  const statusConfig = getStatusConfig(t);
  const paymentStatusConfig = getPaymentStatusConfig(t);
  const nights = calculateReservationNights(
    reservation.arrivaldate,
    reservation.departuredate
  );
  const total = reservation.pricePerNight * nights + reservation.cleaningFee;
  const statusMeta = statusConfig[reservation.status] || {
    label: isShellLoading ? t.loading.status : t.empty.reservation,
    icon: null,
  };
  const paymentMeta = paymentStatusConfig[reservation.status] || {
    label: isShellLoading ? t.loading.payment : t.headings.payment,
    text: isShellLoading
      ? t.loading.paymentStatus
      : t.empty.paymentStatusUnavailable,
    className: "",
  };
  const title = hasDisplayValue(reservation.title) ? reservation.title : t.pageTitle;
  const guestName = hasDisplayValue(reservation.guestname)
    ? reservation.guestname
    : t.labels.guestFallbackName;

  return {
    title,
    guestName,
    nights,
    total,
    statusMeta,
    paymentMeta,
    channelText: reservation.channel || DEFAULT_CHANNEL,
    locationLabel: buildLocationLabel(reservation, isShellLoading, t),
    arrivalLabel: buildLoadingAwareText(
      formatShortDate(reservation.arrivaldate),
      isShellLoading,
      t.labels.loadingValue,
      t.labels.unavailable
    ),
    departureLabel: buildLoadingAwareText(
      formatShortDate(reservation.departuredate),
      isShellLoading,
      t.labels.loadingValue,
      t.labels.unavailable
    ),
    bookedOnText: buildBookedOnText(reservation.bookedOn, isShellLoading, t),
    paymentDateText: buildLoadingAwareText(
      formatShortDate(reservation.bookedOn),
      isShellLoading,
      t.labels.loadingValue,
      t.labels.unavailable
    ),
    paymentMethodLabel: hasReservationData
      ? buildMaskedPaymentMethodLabel(reservation)
      : t.labels.loadingValue,
    reservationIdText: buildLoadingAwareText(
      reservation.reservationId,
      isShellLoading,
      t.labels.loadingValue,
      t.labels.unavailable
    ),
    confirmationText: buildLoadingAwareText(
      reservation.confirmationCode,
      isShellLoading,
      t.labels.loadingValue,
      t.labels.unavailable
    ),
    nightCountText: buildCountLabel(nights, t.labels.night, t.labels.nights),
    guestCountText: buildCountLabel(
      reservation.guests,
      t.labels.guest,
      t.labels.guests
    ),
  };
};

const buildCalendarContext = (reservation) => {
  const propertyId = normalizeStringValue(
    reservation?.propertyId || reservation?.property_id
  );

  return {
    bookingId: getBookingId(reservation),
    propertyId,
    arrivalDate: firstDefined(reservation?.arrivaldate, reservation?.arrivalDate),
    departureDate: firstDefined(
      reservation?.departuredate,
      reservation?.departureDate
    ),
  };
};

const buildMessageContext = (reservation) => ({
  contactId: normalizeStringValue(reservation?.guestId || reservation?.guestid) || null,
  contactName: reservation?.guestname || null,
  propertyId: normalizeStringValue(reservation?.propertyId || reservation?.property_id) || null,
  propertyTitle: reservation?.title || null,
  accoImage: reservation?.image || null,
  platform: "DOMITS",
});

const buildReservationReceiptPayload = (reservation) => {
  const nights = calculateReservationNights(
    reservation.arrivaldate,
    reservation.departuredate
  );
  const total = nights * Number(reservation.pricePerNight || 0) + Number(reservation.cleaningFee || 0);

  return {
    bookingId: getBookingId(reservation),
    reservationId: reservation.reservationId || "unavailable",
    confirmationCode: reservation.confirmationCode || "unavailable",
    statusLabel: RECEIPT_STATUS_LABELS[reservation.status] || "Reservation",
    channel: reservation.channel || DEFAULT_CHANNEL,
    bookedOn: reservation.bookedOn,
    title: reservation.title || "Listing",
    propertyId: reservation.propertyId || reservation.property_id,
    locationLabel:
      [reservation.city, reservation.country].filter(Boolean).join(", ") ||
      "Location unavailable",
    arrivalDate: reservation.arrivaldate,
    departureDate: reservation.departuredate,
    guestCountLabel: buildCountLabel(
      reservation.guests,
      "guest",
      "guests"
    ),
    checkinInstructions:
      reservation.checkinInstructions || "No check-in instructions",
    guestName: reservation.guestname || "Guest",
    guestEmail: reservation.guestemail || "unavailable",
    guestPhone: reservation.guestphone || "unavailable",
    specialRequest: reservation.specialRequest || "None",
    pricePerNight: reservation.pricePerNight,
    nights,
    cleaningFee: reservation.cleaningFee,
    total,
    paymentStatusLabel:
      RECEIPT_PAYMENT_STATUS_LABELS[reservation.status] ||
      "Payment status unavailable",
    paymentDate: reservation.bookedOn,
    paymentMethod: buildMaskedPaymentMethodLabel(reservation),
    cancellationType: reservation.cancellationType || "Not specified",
    cancellationPolicy:
      reservation.cancellationPolicy || "No cancellation policy selected.",
    houseRules:
      reservation.houseRules?.length > 0
        ? reservation.houseRules
        : ["No house rules specified"],
  };
};

const reservationTranslationShape = PropTypes.shape({
  buttons: PropTypes.shape({
    back: PropTypes.string.isRequired,
    messageGuest: PropTypes.string.isRequired,
    viewInCalendar: PropTypes.string.isRequired,
    downloadReceipt: PropTypes.string.isRequired,
    preparingReceipt: PropTypes.string.isRequired,
  }).isRequired,
  headings: PropTypes.shape({
    property: PropTypes.string.isRequired,
    guest: PropTypes.string.isRequired,
    payment: PropTypes.string.isRequired,
    reservationInfo: PropTypes.string.isRequired,
    actions: PropTypes.string.isRequired,
    checkInInstructions: PropTypes.string.isRequired,
    houseRules: PropTypes.string.isRequired,
    cancellationPolicy: PropTypes.string.isRequired,
    specialRequest: PropTypes.string.isRequired,
  }).isRequired,
  labels: PropTypes.shape({
    bookedVia: PropTypes.string.isRequired,
    checkIn: PropTypes.string.isRequired,
    bookedOn: PropTypes.string.isRequired,
    reservationId: PropTypes.string.isRequired,
    confirmation: PropTypes.string.isRequired,
    cleaningFee: PropTypes.string.isRequired,
    totalPaid: PropTypes.string.isRequired,
    method: PropTypes.string.isRequired,
    propertyImageAlt: PropTypes.string.isRequired,
    guestFallbackName: PropTypes.string.isRequired,
    loadingValue: PropTypes.string.isRequired,
    unavailable: PropTypes.string.isRequired,
    none: PropTypes.string.isRequired,
    locationUnavailable: PropTypes.string.isRequired,
    loadingLocation: PropTypes.string.isRequired,
    night: PropTypes.string.isRequired,
    nights: PropTypes.string.isRequired,
    guest: PropTypes.string.isRequired,
    guests: PropTypes.string.isRequired,
  }).isRequired,
  loading: PropTypes.shape({
    status: PropTypes.string.isRequired,
    summary: PropTypes.string.isRequired,
    reservationDetails: PropTypes.string.isRequired,
    guestEmail: PropTypes.string.isRequired,
    guestPhone: PropTypes.string.isRequired,
    checkInInstructions: PropTypes.string.isRequired,
    houseRules: PropTypes.string.isRequired,
    cancellationPolicy: PropTypes.string.isRequired,
    payment: PropTypes.string.isRequired,
    paymentStatus: PropTypes.string.isRequired,
  }).isRequired,
  empty: PropTypes.shape({
    noCheckInInstructions: PropTypes.string.isRequired,
    noHouseRulesSpecified: PropTypes.string.isRequired,
    noCancellationPolicySelected: PropTypes.string.isRequired,
    paymentStatusUnavailable: PropTypes.string.isRequired,
    reservation: PropTypes.string.isRequired,
  }).isRequired,
  requestActions: PropTypes.shape({
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    accept: PropTypes.string.isRequired,
    decline: PropTypes.string.isRequired,
    confirmAcceptTitle: PropTypes.string.isRequired,
    confirmAcceptNoOverlap: PropTypes.string.isRequired,
    confirmAcceptWithOverlap: PropTypes.string.isRequired,
    confirmDeclineTitle: PropTypes.string.isRequired,
    confirmDeclineMessage: PropTypes.string.isRequired,
    accepted: PropTypes.string.isRequired,
    acceptedWithOverlap: PropTypes.string.isRequired,
    declined: PropTypes.string.isRequired,
    updateFailed: PropTypes.string.isRequired,
    cancel: PropTypes.string.isRequired,
  }).isRequired,
});

const reservationShape = PropTypes.shape({
  image: PropTypes.string,
  checkinInstructions: PropTypes.string,
  houseRules: PropTypes.arrayOf(PropTypes.string),
  cancellationType: PropTypes.string,
  cancellationPolicy: PropTypes.string,
  guestProfileImage: PropTypes.string,
  guestemail: PropTypes.string,
  guestphone: PropTypes.string,
  specialRequest: PropTypes.string,
  pricePerNight: PropTypes.number,
  cleaningFee: PropTypes.number,
  status: PropTypes.string,
  reservationId: PropTypes.string,
  confirmationCode: PropTypes.string,
});

const viewModelShape = PropTypes.shape({
  title: PropTypes.string.isRequired,
  locationLabel: PropTypes.string.isRequired,
  arrivalLabel: PropTypes.string.isRequired,
  departureLabel: PropTypes.string.isRequired,
  nights: PropTypes.number.isRequired,
  nightCountText: PropTypes.string.isRequired,
  guestCountText: PropTypes.string.isRequired,
  bookedOnText: PropTypes.string.isRequired,
  paymentDateText: PropTypes.string.isRequired,
  paymentMethodLabel: PropTypes.string.isRequired,
  reservationIdText: PropTypes.string.isRequired,
  confirmationText: PropTypes.string.isRequired,
  guestName: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
  channelText: PropTypes.string.isRequired,
  statusMeta: PropTypes.shape({
    icon: PropTypes.node,
    label: PropTypes.string.isRequired,
  }).isRequired,
  paymentMeta: PropTypes.shape({
    label: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    className: PropTypes.string,
  }).isRequired,
});

const findReservationBooking = async ({
  reservationId,
  initialBooking,
  authToken,
}) => {
  if (initialBooking) {
    return initialBooking;
  }

  if (!authToken) {
    throw new Error("Could not load reservation without an active host session.");
  }

  const reservationData = await getReservationsFromToken(authToken);
  const booking = mapReservations(reservationData).find(
    (candidateBooking) =>
      getBookingId(candidateBooking) === normalizeStringValue(reservationId)
  );

  if (!booking) {
    throw new Error("Reservation not found.");
  }

  return booking;
};

const loadReservationEnrichment = async ({ authToken, propertyId, guestId }) => {
  const [propertyDetailsResult, guestProfileResult] = await Promise.allSettled([
    authToken && propertyId
      ? fetchHostPropertyDetails(propertyId, authToken)
      : Promise.resolve(null),
    guestId
      ? fetchUserProfileById(guestId)
      : Promise.resolve(getEmptyUserProfile(guestId)),
  ]);

  return {
    propertyDetails:
      propertyDetailsResult.status === "fulfilled"
        ? propertyDetailsResult.value
        : null,
    guestProfile:
      guestProfileResult.status === "fulfilled"
        ? guestProfileResult.value
        : getEmptyUserProfile(guestId),
  };
};

const useReservationDetailsData = (reservationId, initialBooking) => {
  const [reservationData, setReservationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadReservation = async () => {
      setLoading(true);
      setError(false);
      setReservationData(null);

      try {
        const authToken = getAccessToken();
        const booking = await findReservationBooking({
          reservationId,
          initialBooking,
          authToken,
        });
        const propertyId = getPropertyId(booking);
        const guestId = getGuestId(booking);
        const baseReservationModel = buildReservationDetailsModel({
          booking,
          propertyDetails: null,
          guestProfile: null,
        });

        if (isMounted) {
          setReservationData(baseReservationModel);
        }

        const { propertyDetails, guestProfile } = await loadReservationEnrichment({
          authToken,
          propertyId,
          guestId,
        });

        if (!isMounted) {
          return;
        }

        setReservationData(
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

        setReservationData(null);
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
  }, [initialBooking, reservationId]);

  return {
    reservationData,
    setReservationData,
    loading,
    error,
  };
};

const InlineLoader = ({ message }) => (
  <PulseBarsLoader inline message={message} className={styles.inlineLoader} />
);

InlineLoader.propTypes = {
  message: PropTypes.string.isRequired,
};

const InlineTextOrLoader = ({
  value,
  isLoading,
  loadingMessage,
  emptyText,
}) => {
  if (hasDisplayValue(value)) {
    return value;
  }

  if (isLoading) {
    return <InlineLoader message={loadingMessage} />;
  }

  return emptyText;
};

InlineTextOrLoader.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  isLoading: PropTypes.bool.isRequired,
  loadingMessage: PropTypes.string.isRequired,
  emptyText: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
};

const PropertyCheckInSummary = ({ checkinInstructions, isLoading, t }) => {
  if (hasDisplayValue(checkinInstructions)) {
    return (
      <p>
        {t.labels.checkIn}: {checkinInstructions}
      </p>
    );
  }

  if (isLoading) {
    return <InlineLoader message={t.loading.reservationDetails} />;
  }

  return null;
};

PropertyCheckInSummary.propTypes = {
  checkinInstructions: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
  t: reservationTranslationShape.isRequired,
};

const GuestContactLine = ({ icon, value, isLoading, loadingMessage, emptyText }) => (
  <div className={styles.guestLine}>
    {icon}{" "}
    <InlineTextOrLoader
      value={value}
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      emptyText={emptyText}
    />
  </div>
);

GuestContactLine.propTypes = {
  icon: PropTypes.node.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  isLoading: PropTypes.bool.isRequired,
  loadingMessage: PropTypes.string.isRequired,
  emptyText: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
};

const HouseRulesContent = ({ houseRules, isLoading, t }) => {
  if (houseRules.length > 0) {
    return houseRules.map((rule) => (
      <div key={rule} className={styles.guestLine}>
        {getRuleIcon(rule)} {rule}
      </div>
    ));
  }

  if (isLoading) {
    return <InlineLoader message={t.loading.houseRules} />;
  }

  return (
    <div className={styles.guestLine}>
      <FiHome /> {t.empty.noHouseRulesSpecified}
    </div>
  );
};

HouseRulesContent.propTypes = {
  houseRules: PropTypes.arrayOf(PropTypes.string).isRequired,
  isLoading: PropTypes.bool.isRequired,
  t: reservationTranslationShape.isRequired,
};

const CancellationPolicyContent = ({
  cancellationType,
  cancellationPolicy,
  isLoading,
  t,
}) => (
  <>
    {hasDisplayValue(cancellationType) ? (
      <span className={styles.policyTag}>{cancellationType}</span>
    ) : null}
    <div className={styles.grayBox}>
      <InlineTextOrLoader
        value={cancellationPolicy}
        isLoading={isLoading}
        loadingMessage={t.loading.cancellationPolicy}
        emptyText={t.empty.noCancellationPolicySelected}
      />
    </div>
  </>
);

CancellationPolicyContent.propTypes = {
  cancellationType: PropTypes.string,
  cancellationPolicy: PropTypes.string,
  isLoading: PropTypes.bool.isRequired,
  t: reservationTranslationShape.isRequired,
};

const PropertyCard = ({ reservation, viewModel, loading, t }) => (
  <div className={styles.card}>
    <div className={styles.blockHeader}>
      <span>{t.headings.property}</span>
    </div>

    <div className={styles.property}>
      <img
        src={reservation.image || placeholderImage}
        className={styles.image}
        alt={viewModel.title || t.labels.propertyImageAlt}
        onError={(event) => {
          event.currentTarget.src = placeholderImage;
        }}
      />

      <div className={styles.propertyDetails}>
        <h4>{viewModel.title}</h4>

        <p className={styles.location}>
          <FiMapPin /> {viewModel.locationLabel}
        </p>

        <p className={styles.dates}>
          {viewModel.arrivalLabel} {"\u2192"} {viewModel.departureLabel}
        </p>

        <PropertyCheckInSummary
          checkinInstructions={reservation.checkinInstructions}
          isLoading={loading}
          t={t}
        />

        <div className={styles.metaLine}>
          <span>{viewModel.nightCountText}</span>
          <span>{viewModel.guestCountText}</span>
        </div>

        <p className={styles.bookingDate}>{viewModel.bookedOnText}</p>
      </div>
    </div>

    <div className={styles.reservationMeta}>
      <span>
        {t.labels.reservationId}: {viewModel.reservationIdText}
      </span>
      <span>
        {t.labels.confirmation}: {viewModel.confirmationText}
      </span>
    </div>
  </div>
);

PropertyCard.propTypes = {
  reservation: reservationShape.isRequired,
  viewModel: viewModelShape.isRequired,
  loading: PropTypes.bool.isRequired,
  t: reservationTranslationShape.isRequired,
};

const GuestCard = ({ reservation, viewModel, loading, hasReservationData, t, onMessageGuest }) => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <div className={styles.blockHeader}>
        <span>{t.headings.guest}</span>
      </div>

      <button
        className={styles.secondaryBtnGuest}
        onClick={onMessageGuest}
        disabled={!hasReservationData}
      >
        <FiMessageCircle /> {t.buttons.messageGuest}
      </button>
    </div>

    <div className={styles.guestRow}>
      <div className={styles.avatarWrap}>
        <div className={styles.avatar}>
          {viewModel.guestName.charAt(0).toUpperCase()}
        </div>
        {reservation.guestProfileImage ? (
          <img
            src={reservation.guestProfileImage}
            alt={viewModel.guestName}
            className={styles.avatarImage}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
      </div>

      <div className={styles.guestInfo}>
        <strong>{viewModel.guestName}</strong>

        <GuestContactLine
          icon={<FiMail />}
          value={reservation.guestemail}
          isLoading={loading}
          loadingMessage={t.loading.guestEmail}
          emptyText={t.labels.unavailable}
        />

        <GuestContactLine
          icon={<FiPhone />}
          value={reservation.guestphone}
          isLoading={loading}
          loadingMessage={t.loading.guestPhone}
          emptyText={t.labels.unavailable}
        />
      </div>

      {hasDisplayValue(reservation.specialRequest) ? (
        <div className={styles.request}>
          <strong>{t.headings.specialRequest}</strong>
          <span>{reservation.specialRequest}</span>
        </div>
      ) : null}
    </div>
  </div>
);

GuestCard.propTypes = {
  reservation: reservationShape.isRequired,
  viewModel: viewModelShape.isRequired,
  loading: PropTypes.bool.isRequired,
  hasReservationData: PropTypes.bool.isRequired,
  t: reservationTranslationShape.isRequired,
  onMessageGuest: PropTypes.func.isRequired,
};

const PaymentCard = ({ reservation, viewModel, t }) => (
  <div className={styles.card}>
    <div className={styles.blockHeader}>
      <span>{t.headings.payment}</span>
    </div>

    <div className={styles.paymentWrapper}>
      <div className={styles.payment}>
        <div className={styles.row}>
          <span>
            {"\u20AC"}
            {formatCurrency(reservation.pricePerNight)} x {viewModel.nightCountText}
          </span>
          <span>
            {"\u20AC"}
            {formatCurrency(reservation.pricePerNight * viewModel.nights)}
          </span>
        </div>

        <div className={styles.row}>
          <span>{t.labels.cleaningFee}</span>
          <span>
            {"\u20AC"}
            {formatCurrency(reservation.cleaningFee)}
          </span>
        </div>

        <div className={styles.divider}></div>

        <div className={`${styles.row} ${styles.total}`}>
          <span>{t.labels.totalPaid}</span>
          <span>
            {"\u20AC"}
            {formatCurrency(viewModel.total)}
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
          <span>{viewModel.paymentMeta.label}</span>
        </div>

        <div className={styles.paymentStatus}>
          <span className={viewModel.paymentMeta.className}>
            {viewModel.paymentMeta.text}
          </span>
          <span className={styles.date}>{viewModel.paymentDateText}</span>
        </div>

        <div className={styles.paymentMethod}>
          <span className={viewModel.paymentMeta.className}>{t.labels.method}</span>
          <span className={styles.date}>{viewModel.paymentMethodLabel}</span>
        </div>
      </div>
    </div>
  </div>
);

PaymentCard.propTypes = {
  reservation: reservationShape.isRequired,
  viewModel: viewModelShape.isRequired,
  t: reservationTranslationShape.isRequired,
};

const RequestActionsCard = ({
  isBusy,
  onAccept,
  onDecline,
  t,
}) => (
  <div className={`${styles.card} ${styles.requestActionsCard}`}>
    <div className={styles.blockHeader}>
      <span>{t.requestActions.title}</span>
    </div>

    <p className={styles.requestActionsSubtitle}>{t.requestActions.subtitle}</p>

    <div className={styles.requestActionsGrid}>
      <button
        className={`${styles.requestActionButton} ${styles.requestActionAccept}`}
        onClick={onAccept}
        disabled={isBusy}
      >
        {t.requestActions.accept}
      </button>

      <button
        className={`${styles.requestActionButton} ${styles.requestActionDecline}`}
        onClick={onDecline}
        disabled={isBusy}
      >
        {t.requestActions.decline}
      </button>
    </div>
  </div>
);

RequestActionsCard.propTypes = {
  isBusy: PropTypes.bool.isRequired,
  onAccept: PropTypes.func.isRequired,
  onDecline: PropTypes.func.isRequired,
  t: reservationTranslationShape.isRequired,
};

const RequestConfirmationModal = ({
  action,
  overlappingCount,
  onConfirm,
  onCancel,
  t,
}) => {
  const isDeclineAction = action === "decline-inquiry";
  const title = isDeclineAction
    ? t.requestActions.confirmDeclineTitle
    : t.requestActions.confirmAcceptTitle;
  let message = t.requestActions.confirmAcceptNoOverlap;

  if (isDeclineAction) {
    message = t.requestActions.confirmDeclineMessage;
  } else if (overlappingCount > 0) {
    message = formatTemplate(t.requestActions.confirmAcceptWithOverlap, {
      count: overlappingCount,
    });
  }

  const confirmButtonClass = isDeclineAction
    ? styles.requestActionDecline
    : styles.requestActionAccept;
  const confirmButtonLabel = isDeclineAction
    ? t.requestActions.decline
    : t.requestActions.accept;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalText}>{message}</p>
        <div className={styles.modalActions}>
          <button
            className={`${styles.requestActionButton} ${confirmButtonClass}`}
            onClick={onConfirm}
          >
            {confirmButtonLabel}
          </button>
          <button
            className={`${styles.requestActionButton} ${styles.secondaryActionBtn}`}
            onClick={onCancel}
          >
            {t.requestActions.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

RequestConfirmationModal.propTypes = {
  action: PropTypes.string.isRequired,
  overlappingCount: PropTypes.number.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  t: reservationTranslationShape.isRequired,
};

const ReservationInfoCard = ({ reservation, loading, t }) => (
  <div className={styles.card}>
    <div className={styles.blockHeader}>
      <span>{t.headings.reservationInfo}</span>
    </div>

    <div className={styles.block}>
      <div className={styles.blockHeader2}>
        <span>{t.headings.checkInInstructions}</span>
      </div>

      <div className={styles.grayBox}>
        <InlineTextOrLoader
          value={reservation.checkinInstructions}
          isLoading={loading}
          loadingMessage={t.loading.checkInInstructions}
          emptyText={t.empty.noCheckInInstructions}
        />
      </div>
    </div>

    <div className={styles.block}>
      <div className={styles.blockHeader2}>
        <span>{t.headings.houseRules}</span>
      </div>

      <div className={styles.grayBox}>
        <HouseRulesContent
          houseRules={reservation.houseRules || []}
          isLoading={loading}
          t={t}
        />
      </div>
    </div>

    <div className={styles.block}>
      <div className={styles.blockHeader2}>
        <span>{t.headings.cancellationPolicy}</span>
      </div>

      <CancellationPolicyContent
        cancellationType={reservation.cancellationType}
        cancellationPolicy={reservation.cancellationPolicy}
        isLoading={loading}
        t={t}
      />
    </div>
  </div>
);

ReservationInfoCard.propTypes = {
  reservation: reservationShape.isRequired,
  loading: PropTypes.bool.isRequired,
  t: reservationTranslationShape.isRequired,
};

const ActionsCard = ({
  hasReservationData,
  isDownloadingReceipt,
  onViewInCalendar,
  onDownloadReceipt,
  t,
}) => (
  <div className={styles.card}>
    <div className={styles.blockHeader}>
      <span>{t.headings.actions}</span>
    </div>

    <button
      className={styles.primaryBtn}
      onClick={onViewInCalendar}
      disabled={!hasReservationData}
    >
      <FiCalendar /> {t.buttons.viewInCalendar}
    </button>

    <button
      className={styles.secondaryActionBtn}
      onClick={onDownloadReceipt}
      disabled={!hasReservationData || isDownloadingReceipt}
    >
      <FiDownload />{" "}
      {isDownloadingReceipt
        ? t.buttons.preparingReceipt
        : t.buttons.downloadReceipt}
    </button>
  </div>
);

ActionsCard.propTypes = {
  hasReservationData: PropTypes.bool.isRequired,
  isDownloadingReceipt: PropTypes.bool.isRequired,
  onViewInCalendar: PropTypes.func.isRequired,
  onDownloadReceipt: PropTypes.func.isRequired,
  t: reservationTranslationShape.isRequired,
};

const HostReservationDetails = () => {
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const initialBooking = location.state?.booking || null;
  const t =
    hostReservationDetailsTranslations[language] ||
    hostReservationDetailsTranslations.en;
  const { reservationData, setReservationData, loading, error } = useReservationDetailsData(
    id,
    initialBooking
  );
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isUpdatingInquiry, setIsUpdatingInquiry] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  if (error && !reservationData) {
    return <div className={styles.container}>{t.states.failedToLoad}</div>;
  }

  if (!loading && !reservationData) {
    return <div className={styles.container}>{t.states.noReservationFound}</div>;
  }

  const reservation = reservationData || EMPTY_RESERVATION_DETAILS;
  const isShellLoading = loading && !reservationData;
  const hasReservationData = Boolean(reservationData);
  const viewModel = buildReservationViewModel({
    reservation,
    hasReservationData,
    isShellLoading,
    t,
  });
  const showRequestActions = reservation.status === "INQUIRY";

  const handleViewInCalendar = () => {
    if (!hasReservationData) {
      return;
    }

    const hostId = normalizeStringValue(getCognitoUserId());
    const calendarContext = buildCalendarContext(reservationData);

    if (hostId && calendarContext.propertyId) {
      persistSelectedPropertyId(hostId, calendarContext.propertyId);
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
    if (!hasReservationData) {
      return;
    }

    navigate("/hostdashboard/messages", {
      state: {
        messageContext: buildMessageContext(reservationData),
      },
    });
  };

  const executeInquiryAction = async (action) => {
    if (!hasReservationData || isUpdatingInquiry) {
      return;
    }

    const authToken = getAccessToken();
    if (!authToken) {
      toast.error(t.requestActions.updateFailed);
      return;
    }

    setIsUpdatingInquiry(true);

    try {
      const result = await updateInquiryStatus(
        getBookingId(reservationData),
        action,
        authToken
      );
      const nextStatus =
        action === "accept-inquiry" ? "AWAITING_PAYMENT" : "DECLINED";
      const declinedCount = Number(result?.declinedCount || 0);

      setReservationData((currentReservation) => {
        if (!currentReservation) {
          return currentReservation;
        }

        return {
          ...currentReservation,
          status: nextStatus,
        };
      });

      if (action === "accept-inquiry") {
        if (declinedCount > 0) {
          toast.success(
            formatTemplate(t.requestActions.acceptedWithOverlap, {
              count: declinedCount,
            })
          );
        } else {
          toast.success(t.requestActions.accepted);
        }
      } else {
        toast.success(t.requestActions.declined);
      }
    } catch (updateError) {
      console.error("Failed to update request status:", updateError);
      toast.error(t.requestActions.updateFailed);
    } finally {
      setIsUpdatingInquiry(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!hasReservationData || isUpdatingInquiry) {
      return;
    }

    const authToken = getAccessToken();
    if (!authToken) {
      toast.error(t.requestActions.updateFailed);
      return;
    }

    setIsUpdatingInquiry(true);

    try {
      const bookingsPayload = await getReservationsFromToken(authToken);
      const overlappingCount = mapReservations(bookingsPayload).filter((booking) =>
        isOverlappingInquiry(booking, reservationData)
      ).length;

      setConfirmAction({
        action: "accept-inquiry",
        overlappingCount,
      });
    } catch (loadError) {
      console.error("Failed to prepare inquiry confirmation:", loadError);
      setConfirmAction({
        action: "accept-inquiry",
        overlappingCount: 0,
      });
    } finally {
      setIsUpdatingInquiry(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction?.action) {
      return;
    }

    const action = confirmAction.action;
    setConfirmAction(null);
    await executeInquiryAction(action);
  };

  const handleDeclineRequest = async () => {
    if (!hasReservationData || isUpdatingInquiry) {
      return;
    }

    setConfirmAction({
      action: "decline-inquiry",
      overlappingCount: 0,
    });
  };

  const handleDownloadReceipt = async () => {
    if (!hasReservationData || isDownloadingReceipt) {
      return;
    }

    setIsDownloadingReceipt(true);

    try {
      await downloadReservationReceiptPdf(
        buildReservationReceiptPayload(reservationData)
      );
    } catch (downloadError) {
      console.error("Failed to download reservation receipt:", downloadError);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <FiArrowLeft />
        {t.buttons.back}
      </button>

      <h1 className={styles.title}>{viewModel.title}</h1>

      <div className={styles.meta}>
        <span className={`${styles.status} ${STATUS_CLASS[reservation.status] || ""}`}>
          {viewModel.statusMeta.icon}
          {viewModel.statusMeta.label}
        </span>

        <div className={styles.channel}>
          {isShellLoading ? (
            <InlineLoader message={t.loading.summary} />
          ) : (
            `${t.labels.bookedVia} ${viewModel.channelText}`
          )}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.left}>
          <PropertyCard
            reservation={reservation}
            viewModel={viewModel}
            loading={loading}
            t={t}
          />
          <GuestCard
            reservation={reservation}
            viewModel={viewModel}
            loading={loading}
            hasReservationData={hasReservationData}
            t={t}
            onMessageGuest={handleMessageGuest}
          />
          <PaymentCard reservation={reservation} viewModel={viewModel} t={t} />
        </div>

        <div className={styles.right}>
          {showRequestActions ? (
            <RequestActionsCard
              isBusy={isUpdatingInquiry}
              onAccept={handleAcceptRequest}
              onDecline={handleDeclineRequest}
              t={t}
            />
          ) : null}
          <ReservationInfoCard reservation={reservation} loading={loading} t={t} />
          <ActionsCard
            hasReservationData={hasReservationData}
            isDownloadingReceipt={isDownloadingReceipt}
            onViewInCalendar={handleViewInCalendar}
            onDownloadReceipt={handleDownloadReceipt}
            t={t}
          />
        </div>
      </div>

      {confirmAction ? (
        <RequestConfirmationModal
          action={confirmAction.action}
          overlappingCount={confirmAction.overlappingCount}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
          t={t}
        />
      ) : null}
    </div>
  );
};

export default HostReservationDetails;
