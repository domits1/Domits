import { useEffect, useMemo, useState } from "react";

import { fetchHostPropertySelectOptions } from "../services/hostTaskPropertyService";
import { HostRevenueService } from "../services/HostRevenueService";
import getReservationsFromToken from "../services/getReservationsFromToken";
import { fetchTasks } from "../services/taskService";
import { getAccessToken } from "../../../services/getAccessToken";
import useFetchContacts from "../hostmessages/hooks/useFetchContacts";
import {
  fetchUserProfileById,
  getEmptyUserProfile,
} from "../services/fetchUserProfileById";
import useDashboardIdentity from "../../../hooks/useDashboardIdentity";
import {
  buildRecentMessages,
  countContactsWithMessagesOnDay,
  isSameDay,
  isValidDate,
  startOfDay,
} from "../../../utils/dashboardShared";

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
  stats: false,
  reservations: false,
  arrivals: false,
  tasks: false,
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const toDate = (value) => {
  const date = new Date(value);
  return isValidDate(date) ? date : null;
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
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll(/\b\w/g, (character) => character.toUpperCase());

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
        guestId:
          reservation?.guestid ||
          reservation?.guestId ||
          reservation?.guest_id ||
          reservation?.userId ||
          reservation?.user_id ||
          null,
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

const enrichReservationsWithGuestProfiles = async (reservations) => {
  const safeReservations = Array.isArray(reservations) ? reservations : [];
  const uniqueGuestIds = [...new Set(safeReservations.map((reservation) => reservation?.guestId).filter(Boolean))];

  if (uniqueGuestIds.length === 0) {
    return safeReservations;
  }

  const profileEntries = await Promise.all(
    uniqueGuestIds.map(async (guestId) => {
      const profile = await fetchUserProfileById(guestId);
      return [guestId, profile || getEmptyUserProfile(guestId)];
    })
  );

  const profileMap = new Map(profileEntries);

  return safeReservations.map((reservation) => {
    const guestProfile = profileMap.get(reservation?.guestId);

    return {
      ...reservation,
      avatar: guestProfile?.profileImage || null,
    };
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

export default function useHostDashboardData() {
  const [dashboardData, setDashboardData] = useState(INITIAL_DATA);
  const [loadingState, setLoadingState] = useState(INITIAL_LOADING_STATE);
  const [error, setError] = useState(null);
  const {
    userId: hostId,
    displayName: hostName,
    loading: identityLoading,
    error: identityError,
  } = useDashboardIdentity("Host");

  const { contacts, loading: contactsLoading } = useFetchContacts(hostId, "host");

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
          bookingsPayload === "Data not found" ? [] : await enrichReservationsWithGuestProfiles(flattenBookingsPayload(bookingsPayload));
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

  const recentMessages = useMemo(() => buildRecentMessages(contacts, "Guest"), [contacts]);

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
        messages: countContactsWithMessagesOnDay(contacts, today, toDate),
      },
    }));
  }, [contacts, contactsLoading, hostId, recentMessages]);

  const isMessagesLoading = identityLoading || hostId === null || contactsLoading;

  const sectionLoading = {
    stats: identityLoading || loadingState.stats,
    reservations: identityLoading || loadingState.reservations,
    arrivals: identityLoading || loadingState.arrivals,
    tasks: identityLoading || loadingState.tasks,
    messages: isMessagesLoading,
    today: {
      checkins: identityLoading || loadingState.reservations,
      checkouts: identityLoading || loadingState.reservations,
      messages: isMessagesLoading,
      tasks: identityLoading || loadingState.tasks,
    },
  };

  return {
    ...dashboardData,
    hostName,
    loading: sectionLoading,
    error: error || identityError,
  };
}