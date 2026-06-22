import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const DEFAULT_RESERVATION_DETAILS_TRANSLATION = Object.freeze({
  pageTitle: "Reservation details",
  buttons: {
    back: "Back",
    messageGuest: "Message guest",
    viewInCalendar: "View in calendar",
    preparingReceipt: "Preparing receipt...",
    downloadReceipt: "Download receipt",
  },
  headings: {
    property: "Property",
    guest: "Guest",
    specialRequest: "Special request",
    payment: "Payment",
    reservationInfo: "Reservation information",
    checkInInstructions: "Check-in instructions",
    houseRules: "House rules",
    cancellationPolicy: "Cancellation policy",
    actions: "Actions",
  },
  labels: {
    loadingLocation: "Loading location...",
    locationUnavailable: "Location unavailable",
    loadingValue: "Loading...",
    unavailable: "Unavailable",
    bookedOn: "Booked on",
    guestFallbackName: "Guest",
    night: "night",
    nights: "nights",
    guest: "guest",
    guests: "guests",
    checkIn: "Check-in",
    propertyImageAlt: "Property image",
    reservationId: "Reservation ID",
    confirmation: "Confirmation",
    cleaningFee: "Cleaning fee",
    totalPaid: "Total paid",
    method: "Method",
    bookedVia: "Booked via",
  },
  loading: {
    status: "Loading status...",
    payment: "Loading payment...",
    paymentStatus: "Loading payment status...",
    reservationDetails: "Loading reservation details...",
    houseRules: "Loading house rules...",
    cancellationPolicy: "Loading cancellation policy...",
    checkInInstructions: "Loading check-in instructions...",
    guestEmail: "Loading guest email...",
    guestPhone: "Loading guest phone...",
    summary: "Loading summary...",
  },
  empty: {
    reservation: "Reservation",
    paymentStatusUnavailable: "Payment status unavailable",
    noHouseRulesSpecified: "No house rules specified",
    noCancellationPolicySelected: "No cancellation policy selected",
    noCheckInInstructions: "No check-in instructions",
  },
  status: {
    PAID: "Paid",
    AWAITING_PAYMENT: "Awaiting payment",
    FAILED: "Failed",
    DECLINED: "Declined",
    INQUIRY: "Request",
  },
  paymentStatus: {
    PAID: {
      label: "Paid",
      text: "Payment received",
    },
    AWAITING_PAYMENT: {
      label: "Awaiting payment",
      text: "Awaiting payment",
    },
    FAILED: {
      label: "Failed",
      text: "Payment failed",
    },
    DECLINED: {
      label: "Declined",
      text: "Payment declined",
    },
    INQUIRY: {
      label: "Request",
      text: "Pending request",
    },
  },
  requestActions: {
    title: "Request actions",
    subtitle: "Review this request before you accept or decline it.",
    accept: "Accept",
    decline: "Decline",
    cancel: "Cancel",
    confirmAcceptTitle: "Accept this request?",
    confirmAcceptNoOverlap: "Are you sure you want to accept this request?",
    confirmAcceptWithOverlap:
      "There are {count} other overlapping pending requests for this property. Accepting will automatically decline them.",
    confirmDeclineTitle: "Decline this request?",
    confirmDeclineMessage: "Are you sure you want to decline this request?",
    accepted: "Request accepted.",
    acceptedWithOverlap:
      "Request accepted. {count} other overlapping requests were automatically declined.",
    declined: "Request declined.",
    updateFailed: "Failed to update request status.",
  },
  states: {
    failedToLoad: "Failed to load reservation details.",
    noReservationFound: "No reservation found.",
  },
});

const mergeReservationDetailsTranslation = (translation = {}) => ({
  ...DEFAULT_RESERVATION_DETAILS_TRANSLATION,
  ...translation,
  buttons: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.buttons,
    ...translation?.buttons,
  },
  headings: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.headings,
    ...translation?.headings,
  },
  labels: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.labels,
    ...translation?.labels,
  },
  loading: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.loading,
    ...translation?.loading,
  },
  empty: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.empty,
    ...translation?.empty,
  },
  status: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.status,
    ...translation?.status,
  },
  paymentStatus: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.paymentStatus,
    ...translation?.paymentStatus,
    PAID: {
      ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.paymentStatus.PAID,
      ...translation?.paymentStatus?.PAID,
    },
    AWAITING_PAYMENT: {
      ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.paymentStatus.AWAITING_PAYMENT,
      ...translation?.paymentStatus?.AWAITING_PAYMENT,
    },
    FAILED: {
      ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.paymentStatus.FAILED,
      ...translation?.paymentStatus?.FAILED,
    },
    DECLINED: {
      ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.paymentStatus.DECLINED,
      ...translation?.paymentStatus?.DECLINED,
    },
    INQUIRY: {
      ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.paymentStatus.INQUIRY,
      ...translation?.paymentStatus?.INQUIRY,
    },
  },
  requestActions: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.requestActions,
    ...translation?.requestActions,
  },
  states: {
    ...DEFAULT_RESERVATION_DETAILS_TRANSLATION.states,
    ...translation?.states,
  },
});

const hostReservationDetailsTranslations = {
  en: mergeReservationDetailsTranslation(en.hostDashboard?.reservationDetails),
  nl: mergeReservationDetailsTranslation(nl.hostDashboard?.reservationDetails),
  de: mergeReservationDetailsTranslation(de.hostDashboard?.reservationDetails),
  es: mergeReservationDetailsTranslation(es.hostDashboard?.reservationDetails),
};

export default hostReservationDetailsTranslations;
