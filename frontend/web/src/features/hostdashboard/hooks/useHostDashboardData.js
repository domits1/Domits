import { useEffect, useMemo, useState } from "react";
import { Auth } from "aws-amplify";

import { fetchHostPropertySelectOptions } from "../services/hostTaskPropertyService";
import { HostRevenueService } from "../services/HostRevenueService";
import getReservationsFromToken from "../services/getReservationsFromToken";
import { fetchTasks } from "../services/taskService";
import { getAccessToken } from "../../../services/getAccessToken";
import useFetchContacts from "../hostmessages/hooks/useFetchContacts";

const INITIAL_DATA = {
  hostName: "Host",
  stats: {
    listings: 0,
    reservations: 0,
    revenue: 0,
    occupancy: 0,
  },
  reservations: [],
  today: {
    checkins: 0,
    checkouts: 0,
    messages: 0,
    tasks: 0,
  },
  arrivals: [],
  departures: [],
  messages: [],
};

const INITIAL_LOADING_STATE = {
  identity: true,
  stats: true,
  reservations: true,
  arrivals: true,
  tasks: true,
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const MESSAGE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const toDate = (value) => {
  const date = new Date(value);
  return isValidDate(date) ? date : null;
};

const startOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const isSameDay = (leftDate, rightDate) => {
  if (!isValidDate(leftDate) || !isValidDate(rightDate)) {
    return false;
  }

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

const isOpenTask = (task) => {
  const normalizedStatus = String(task?.status || "").trim().toLowerCase();
  return !["completed", "done", "archived", "cancelled", "canceled"].includes(normalizedStatus);
};

const formatReservationDateRange = (arrivalDate, departureDate) => {
  if (!isValidDate(arrivalDate) || !isValidDate(departureDate)) {
    return "Dates unavailable";
  }

  return `${DATE_FORMATTER.format(arrivalDate)} - ${DATE_FORMATTER.format(departureDate)}`;
};

const humanizeStatus = (value) =>
  String(value || "Upcoming")
    .replaceAll(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const getReservationStatus = (reservation, today) => {
  if (isSameDay(reservation.arrivalDate, today)) {
    return "Arriving today";
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(reservation.arrivalDate, tomorrow)) {
    return "Arriving tomorrow";
  }

  if (
    isValidDate(reservation.arrivalDate) &&
    isValidDate(reservation.departureDate) &&
    reservation.arrivalDate <= today &&
    reservation.departureDate > today
  ) {
    return "Checked-in";
  }

  if (isSameDay(reservation.departureDate, today)) {
    return "Checking out today";
  }

  return humanizeStatus(reservation.statusRaw);
};

const flattenBookingsPayload = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((property) => {
    const reservations = Array.isArray(property?.res?.response) ? property.res.response : [];

    return reservations.map((reservation, index) => {
      const arrivalDate = toDate(reservation?.arrivaldate);
      const departureDate = toDate(reservation?.departuredate);
      const propertyId =
        property?.id || reservation?.property_id || reservation?.propertyId || `property-${index}`;
      const reservationId =
        reservation?.id ||
        `${propertyId}-${reservation?.guestname || reservation?.guestName || "guest"}-${reservation?.arrivaldate || index}`;

      return {
        id: reservationId,
        propertyId,
        guest: String(reservation?.guestname || reservation?.guestName || "Guest").trim(),
        avatar: null,
        property: String(property?.title || reservation?.propertyTitle || "Untitled property").trim(),
        address: [property?.city, property?.country].filter(Boolean).join(", "),
        dates: formatReservationDateRange(arrivalDate, departureDate),
        arrivalDate,
        departureDate,
        createdAt: toDate(reservation?.createdat || reservation?.createdAt),
        statusRaw: reservation?.status,
      };
    });
  });
};

const buildUpcomingReservations = (reservations, today) =>
  reservations
    .filter((reservation) => isValidDate(reservation.departureDate) && startOfDay(reservation.departureDate) >= today)
    .sort((leftReservation, rightReservation) => {
      const leftTime = leftReservation.arrivalDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = rightReservation.arrivalDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .map((reservation) => ({
      ...reservation,
      status: getReservationStatus(reservation, today),
    }));

const buildArrivalDepartureItems = (reservations, key, today, fallbackStatus) =>
  reservations
    .filter((reservation) => isSameDay(reservation[key], today))
    .sort((leftReservation, rightReservation) => {
      const leftTime = leftReservation[key]?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = rightReservation[key]?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 4)
    .map((reservation) => ({
      id: reservation.id,
      guest: reservation.guest,
      avatar: reservation.avatar,
      property: reservation.property,
      dates: reservation.dates,
      status: fallbackStatus,
    }));

const getHostName = (user) => {
  const attributes = user?.attributes || {};
  return attributes.given_name || attributes.name || attributes.preferred_username || user?.username || "Host";
};

const formatMessageTime = (createdAt) => {
  const now = new Date();
  return isSameDay(createdAt, now)
    ? MESSAGE_TIME_FORMATTER.format(createdAt)
    : SHORT_DATE_FORMATTER.format(createdAt);
};

const buildRecentMessages = (contacts) =>
  (Array.isArray(contacts) ? contacts : [])
    .filter((contact) => contact?.latestMessage?.createdAt)
    .sort((leftContact, rightContact) => {
      const leftTime = new Date(leftContact.latestMessage.createdAt).getTime();
      const rightTime = new Date(rightContact.latestMessage.createdAt).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 4)
    .map((contact) => {
      const createdAt = toDate(contact?.latestMessage?.createdAt);
      return {
        id: contact?.threadId || contact?.partnerId || contact?.userId || contact?.recipientId || contact?.givenName,
        name: contact?.givenName || contact?.name || "Guest",
        text: String(contact?.latestMessage?.text || "No message preview available").trim(),
        time: isValidDate(createdAt) ? formatMessageTime(createdAt) : "",
      };
    });

const countTodayMessages = (contacts, today) =>
  (Array.isArray(contacts) ? contacts : []).filter((contact) =>
    isSameDay(toDate(contact?.latestMessage?.createdAt), today)
  ).length;

export default function useHostDashboardData() {
  const [hostId, setHostId] = useState(null);
  const [dashboardData, setDashboardData] = useState(INITIAL_DATA);
  const [loadingState, setLoadingState] = useState(INITIAL_LOADING_STATE);
  const [error, setError] = useState(null);

  const { contacts, loading: contactsLoading } = useFetchContacts(hostId, "host");

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
        if (!isMounted) {
          return;
        }

        setHostId(user?.attributes?.sub || null);
        setDashboardData((previousData) => ({
          ...previousData,
          hostName: getHostName(user),
        }));
        setLoadingState((previousState) => ({
          ...previousState,
          identity: false,
        }));
      } catch {
        if (isMounted) {
          setError("Unable to load your dashboard.");
          setLoadingState({
            identity: false,
            stats: false,
            reservations: false,
            arrivals: false,
            tasks: false,
          });
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      if (!hostId) {
        return;
      }

      setLoadingState((previousState) => ({
        ...previousState,
        stats: true,
      }));

      const [listingsResult, revenueResult, bookedNightsResult, availableNightsResult] = await Promise.allSettled([
        fetchHostPropertySelectOptions(),
        HostRevenueService.getRevenue(hostId),
        HostRevenueService.getBookedNights(hostId),
        HostRevenueService.getAvailableNights(hostId),
      ]);

      if (!isMounted) {
        return;
      }

      const listings =
        listingsResult.status === "fulfilled" && Array.isArray(listingsResult.value)
          ? listingsResult.value
          : [];
      const revenue = revenueResult.status === "fulfilled" ? Number(revenueResult.value) || 0 : 0;
      const bookedNights =
        bookedNightsResult.status === "fulfilled" ? Number(bookedNightsResult.value) || 0 : 0;
      const availableNights =
        availableNightsResult.status === "fulfilled" ? Number(availableNightsResult.value) || 0 : 0;

      setDashboardData((previousData) => ({
        ...previousData,
        stats: {
          ...previousData.stats,
          listings: listings.length,
          revenue,
          occupancy: availableNights > 0 ? Math.round((bookedNights / availableNights) * 100) : 0,
        },
      }));
      setLoadingState((previousState) => ({
        ...previousState,
        stats: false,
      }));
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [hostId]);

  useEffect(() => {
    let isMounted = true;

    const loadReservations = async () => {
      if (!hostId) {
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setError("You must be signed in to view your dashboard.");
        setLoadingState((previousState) => ({
          ...previousState,
          reservations: false,
          arrivals: false,
        }));
        return;
      }

      setLoadingState((previousState) => ({
        ...previousState,
        reservations: true,
        arrivals: true,
      }));

      try {
        const bookingsPayload = await getReservationsFromToken(token);
        if (!isMounted) {
          return;
        }

        const today = startOfDay(new Date());
        const normalizedReservations =
          bookingsPayload === "Data not found" ? [] : flattenBookingsPayload(bookingsPayload);
        const upcomingReservations = buildUpcomingReservations(normalizedReservations, today);
        const arrivals = buildArrivalDepartureItems(normalizedReservations, "arrivalDate", today, "Arriving today");
        const departures = buildArrivalDepartureItems(
          normalizedReservations,
          "departureDate",
          today,
          "Checking out today"
        );

        setDashboardData((previousData) => ({
          ...previousData,
          stats: {
            ...previousData.stats,
            reservations: upcomingReservations.length,
          },
          reservations: upcomingReservations.slice(0, 5),
          today: {
            ...previousData.today,
            checkins: arrivals.length,
            checkouts: departures.length,
          },
          arrivals,
          departures,
        }));
      } catch {
        if (!isMounted) {
          return;
        }

        setDashboardData((previousData) => ({
          ...previousData,
          reservations: [],
          arrivals: [],
          departures: [],
          today: {
            ...previousData.today,
            checkins: 0,
            checkouts: 0,
          },
        }));
      } finally {
        if (isMounted) {
          setLoadingState((previousState) => ({
            ...previousState,
            reservations: false,
            arrivals: false,
          }));
        }
      }
    };

    loadReservations();

    return () => {
      isMounted = false;
    };
  }, [hostId]);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      if (!hostId) {
        return;
      }

      setLoadingState((previousState) => ({
        ...previousState,
        tasks: true,
      }));

      try {
        const tasks = await fetchTasks();
        if (!isMounted) {
          return;
        }

        const today = startOfDay(new Date());
        const todayTasksCount = (Array.isArray(tasks) ? tasks : []).filter(
          (task) => isOpenTask(task) && isSameDay(toDate(task?.dueDate), today)
        ).length;

        setDashboardData((previousData) => ({
          ...previousData,
          today: {
            ...previousData.today,
            tasks: todayTasksCount,
          },
        }));
      } catch {
        if (isMounted) {
          setDashboardData((previousData) => ({
            ...previousData,
            today: {
              ...previousData.today,
              tasks: 0,
            },
          }));
        }
      } finally {
        if (isMounted) {
          setLoadingState((previousState) => ({
            ...previousState,
            tasks: false,
          }));
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [hostId]);

  const recentMessages = useMemo(() => buildRecentMessages(contacts), [contacts]);

  useEffect(() => {
    if (!hostId) {
      return;
    }

    if (contactsLoading) {
      return;
    }

    const today = startOfDay(new Date());

    setDashboardData((previousData) => ({
      ...previousData,
      messages: recentMessages,
      today: {
        ...previousData.today,
        messages: countTodayMessages(contacts, today),
      },
    }));
  }, [contacts, contactsLoading, hostId, recentMessages]);

  const sectionLoading = {
    stats: loadingState.identity || loadingState.stats,
    reservations: loadingState.identity || loadingState.reservations,
    arrivals: loadingState.identity || loadingState.arrivals,
    tasks: loadingState.identity || loadingState.tasks,
    messages: loadingState.identity || (!hostId ? true : contactsLoading),
    today: {
      checkins: loadingState.identity || loadingState.reservations,
      checkouts: loadingState.identity || loadingState.reservations,
      messages: loadingState.identity || (!hostId ? true : contactsLoading),
      tasks: loadingState.identity || loadingState.tasks,
    },
  };

  return {
    ...dashboardData,
    loading: sectionLoading,
    error,
  };
}