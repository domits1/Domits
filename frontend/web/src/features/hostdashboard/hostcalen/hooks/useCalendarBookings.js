import { useEffect, useState } from "react";

import { getAccessToken } from "../../../../services/getAccessToken";
import getReservationsFromToken from "../../services/getReservationsFromToken";
import { buildBookedDateMap } from "./hostCalendarHelpers";

export const useCalendarBookings = () => {
  const [bookedDateKeysByPropertyId, setBookedDateKeysByPropertyId] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadBookings = async () => {
      const token = getAccessToken();
      if (!token) {
        return;
      }

      try {
        const bookingsPayload = await getReservationsFromToken(token);
        if (!mounted || bookingsPayload === "Data not found") {
          return;
        }
        setBookedDateKeysByPropertyId(buildBookedDateMap(bookingsPayload));
      } catch {
        if (mounted) {
          setBookedDateKeysByPropertyId({});
        }
      }
    };

    loadBookings();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    bookedDateKeysByPropertyId,
  };
};
