import { useEffect, useMemo, useState } from "react";

import useFetchContacts from "../../hostdashboard/hostmessages/hooks/useFetchContacts";
import useDashboardIdentity from "../../../hooks/useDashboardIdentity";
import {
  getGuestBookings,
} from "../services/bookingAPI";
import {
  getArrivalDate,
  getBookingId,
  getBookingTotal,
  getDepartureDate,
  getPaidBookings,
  getPropertyId,
  getReservationNumber,
  normalizeStayStatus,
} from "../utils/guestDashboardUtils";
import { normalizeImageUrl, placeholderImage } from "../utils/image";
import {
  resolveAccommodationImageUrl,
} from "../../../utils/accommodationImage";
import { fetchPropertySummaries } from "../services/propertySummaryService";
import {
  buildRecentMessages,
  countContactsWithMessages,
  isSameDay,
  isValidDate,
  startOfDay,
} from "../../../utils/dashboardShared";

const INITIAL_DATA = {
  guestName: "Guest",
  stats: {
    current: 0,
    upcoming: 0,
    past: 0,
    messages: 0,
  },
  currentStay: null,
  upcomingStay: null,
  pastStays: [],
  reminders: [],
  messages: [],
};

const INITIAL_LOADING_STATE = {
  stays: false,
};

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const STAY_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const safeString = (value, fallback = "") => {
  const text = String(value || "").trim();
  return text || fallback;
};

const formatStayDateRange = (arrivalDate, departureDate) => {
  if (!isValidDate(arrivalDate) || !isValidDate(departureDate)) {
    return "Dates unavailable";
  }

  const firstPart = SHORT_DATE_FORMATTER.format(arrivalDate);
  const secondPart = STAY_DATE_FORMATTER.format(departureDate);
  return `${firstPart} - ${secondPart}`;
};

const buildTripReminders = ({ currentStay, upcomingStay, today }) => {
  const reminders = [];

  if (currentStay?.name) {
    reminders.push(`You are staying at ${currentStay.name}`);
  }

  if (currentStay?.departureDate) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (isSameDay(currentStay.departureDate, tomorrow)) {
      reminders.push("Checkout tomorrow");
    }
  }

  if (upcomingStay?.name && upcomingStay?.arrivalDate) {
    reminders.push(
      `${upcomingStay.name} starts ${SHORT_DATE_FORMATTER.format(upcomingStay.arrivalDate)}`
    );
  }

  return reminders.slice(0, 3);
};

const classifyBookings = (bookings) => {
  const today = startOfDay(new Date());

  const currentBookings = [];
  const upcomingBookings = [];
  const pastBookings = [];

  bookings.forEach((booking) => {
    const arrivalDate = getArrivalDate(booking);
    const departureDate = getDepartureDate(booking);

    if (!isValidDate(arrivalDate) || !isValidDate(departureDate)) {
      upcomingBookings.push({ booking, arrivalDate, departureDate });
      return;
    }

    const arrival = startOfDay(arrivalDate);
    const departure = startOfDay(departureDate);

    if (departure < today) {
      pastBookings.push({ booking, arrivalDate, departureDate });
      return;
    }

    if (arrival <= today && departure >= today) {
      currentBookings.push({ booking, arrivalDate, departureDate });
      return;
    }

    upcomingBookings.push({ booking, arrivalDate, departureDate });
  });

  currentBookings.sort((left, right) => {
    const leftTime = left.arrivalDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.arrivalDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });

  upcomingBookings.sort((left, right) => {
    const leftTime = left.arrivalDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.arrivalDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });

  pastBookings.sort((left, right) => {
    const leftTime = left.departureDate?.getTime() ?? 0;
    const rightTime = right.departureDate?.getTime() ?? 0;
    return rightTime - leftTime;
  });

  return { currentBookings, upcomingBookings, pastBookings };
};

const buildStayRecord = ({ booking, arrivalDate, departureDate, propertySummary }) => {
  const propertyId = getPropertyId(booking);
  const fallbackTitle = booking?.title || booking?.Title || (propertyId ? `Property #${propertyId}` : "Stay");
  const fallbackImage =
    resolveAccommodationImageUrl(booking?.images?.[0], "thumb") ||
    resolveAccommodationImageUrl(booking?.property?.images?.[0], "thumb") ||
    normalizeImageUrl(
      booking?.propertyImage || booking?.image || booking?.property?.coverImage || null
    ) ||
    placeholderImage;

  return {
    id: getBookingId(booking) || propertyId || fallbackTitle,
    bookingId: getBookingId(booking),
    propertyId,
    hostId: propertySummary?.hostId || booking?.hostid || booking?.hostId || booking?.host_id || null,
    name: propertySummary?.title || fallbackTitle,
    location: propertySummary?.locationLabel || booking?.city || booking?.location?.city || "Unknown location",
    dates: formatStayDateRange(arrivalDate, departureDate),
    arrivalDate,
    departureDate,
    image: propertySummary?.imageUrl || fallbackImage,
    reservationNumber: getReservationNumber(booking),
    total: getBookingTotal(booking),
    status: normalizeStayStatus(booking?.status),
    hostName:
      propertySummary?.hostName ||
      safeString(booking?.hostname || booking?.hostName || booking?.host?.name, ""),
    hostImage: propertySummary?.hostImage || null,
  };
};

export default function useGuestDashboardData() {
  const [dashboardData, setDashboardData] = useState(INITIAL_DATA);
  const [loadingState, setLoadingState] = useState(INITIAL_LOADING_STATE);
  const [error, setError] = useState(null);
  const {
    userId: guestId,
    displayName: guestName,
    loading: identityLoading,
    error: identityError,
  } = useDashboardIdentity("Guest");

  const { contacts, loading: contactsLoading } = useFetchContacts(guestId, "guest");

  useEffect(() => {
    let isMounted = true;

    const loadStays = async () => {
      if (!guestId) {
        return;
      }

      setLoadingState((previousState) => ({
        ...previousState,
        stays: true,
      }));

      try {
        const bookingData = await getGuestBookings(guestId);
        if (!isMounted) {
          return;
        }

        const paidBookings = getPaidBookings(bookingData);
        const { currentBookings, upcomingBookings, pastBookings } = classifyBookings(paidBookings);

        const visibleBookings = [
          currentBookings[0],
          upcomingBookings[0],
          ...pastBookings.slice(0, 3),
        ].filter(Boolean);

        const propertySummaries = await fetchPropertySummaries(
          visibleBookings.map(({ booking }) => getPropertyId(booking))
        );

        if (!isMounted) {
          return;
        }

        const currentStay =
          currentBookings[0]
            ? buildStayRecord({
                ...currentBookings[0],
                propertySummary: propertySummaries[getPropertyId(currentBookings[0].booking)],
              })
            : null;

        const upcomingStay =
          upcomingBookings[0]
            ? buildStayRecord({
                ...upcomingBookings[0],
                propertySummary: propertySummaries[getPropertyId(upcomingBookings[0].booking)],
              })
            : null;

        const pastStays = pastBookings.slice(0, 3).map((entry) =>
          buildStayRecord({
            ...entry,
            propertySummary: propertySummaries[getPropertyId(entry.booking)],
          })
        );

        setDashboardData((previousData) => ({
          ...previousData,
          stats: {
            ...previousData.stats,
            current: currentBookings.length,
            upcoming: upcomingBookings.length,
            past: pastBookings.length,
          },
          currentStay,
          upcomingStay,
          pastStays,
          reminders: buildTripReminders({
            currentStay,
            upcomingStay,
            today: startOfDay(new Date()),
          }),
        }));
      } catch {
        if (isMounted) {
          setError("Could not load your trip overview.");
          setDashboardData((previousData) => ({
            ...previousData,
            stats: {
              ...previousData.stats,
              current: 0,
              upcoming: 0,
              past: 0,
            },
            currentStay: null,
            upcomingStay: null,
            pastStays: [],
            reminders: [],
          }));
        }
      } finally {
        if (isMounted) {
          setLoadingState((previousState) => ({
            ...previousState,
            stays: false,
          }));
        }
      }
    };

    loadStays();

    return () => {
      isMounted = false;
    };
  }, [guestId]);

  const recentMessages = useMemo(() => buildRecentMessages(contacts, "Host"), [contacts]);

  useEffect(() => {
    if (!guestId || contactsLoading) {
      return;
    }

    setDashboardData((previousData) => ({
      ...previousData,
      stats: {
        ...previousData.stats,
        messages: countContactsWithMessages(contacts),
      },
      messages: recentMessages,
    }));
  }, [contacts, contactsLoading, guestId, recentMessages]);

  return {
    ...dashboardData,
    guestName,
    loading: {
      identity: identityLoading,
      stats: identityLoading || loadingState.stays,
      stays: identityLoading || loadingState.stays,
      messages: identityLoading || contactsLoading,
    },
    error: error || identityError,
  };
}
