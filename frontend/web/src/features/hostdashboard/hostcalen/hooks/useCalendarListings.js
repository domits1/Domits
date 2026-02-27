import { useEffect, useMemo, useState } from "react";

import { getAccessToken, getCognitoUserId } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import {
  buildListingOptions,
  persistSelectedPropertyId,
  readPersistedSelectedPropertyId,
} from "./hostCalendarHelpers";

export const useCalendarListings = () => {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");

  const listingOptions = useMemo(() => buildListingOptions(accommodations), [accommodations]);

  useEffect(() => {
    let mounted = true;

    const loadListings = async () => {
      const hostId = getCognitoUserId();
      const token = getAccessToken();

      if (!token) {
        if (mounted) {
          setIsLoadingListings(false);
          setListingsError("Could not load host listings. Please sign in again.");
        }
        return;
      }

      setIsLoadingListings(true);
      setListingsError("");

      try {
        const allResponse = await fetch(`${PROPERTY_API_BASE}/hostDashboard/all`, {
          method: "GET",
          headers: {
            Authorization: token,
          },
        });

        let listings = [];

        if (allResponse.ok) {
          const allData = await allResponse.json();
          listings = Array.isArray(allData) ? allData : [];
        } else {
          if (!hostId) {
            throw new Error(`Could not load listings (${allResponse.status}).`);
          }
          const fallbackUrl = new URL(`${PROPERTY_API_BASE}/bookingEngine/byHostId`);
          fallbackUrl.searchParams.set("hostId", hostId);
          const fallbackResponse = await fetch(fallbackUrl.toString(), {
            method: "GET",
            headers: {
              Authorization: token,
            },
          });

          if (!fallbackResponse.ok) {
            throw new Error(`Could not load listings (${fallbackResponse.status}).`);
          }
          const fallbackData = await fallbackResponse.json();
          listings = Array.isArray(fallbackData) ? fallbackData : [];
        }

        if (!mounted) {
          return;
        }

        setAccommodations(listings);

        const persistedPropertyId = readPersistedSelectedPropertyId(hostId);
        setSelectedPropertyId((currentPropertyId) => {
          if (
            currentPropertyId &&
            listings.some((listing) => String(listing?.property?.id) === currentPropertyId)
          ) {
            return currentPropertyId;
          }

          if (
            persistedPropertyId &&
            listings.some((listing) => String(listing?.property?.id) === persistedPropertyId)
          ) {
            return persistedPropertyId;
          }

          return String(listings?.[0]?.property?.id || "");
        });
      } catch (error) {
        if (!mounted) {
          return;
        }
        setAccommodations([]);
        setSelectedPropertyId("");
        setListingsError(error?.message || "Could not load host listings.");
      } finally {
        if (mounted) {
          setIsLoadingListings(false);
        }
      }
    };

    loadListings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const hostId = String(getCognitoUserId() || "").trim();
    const propertyId = String(selectedPropertyId || "").trim();
    if (!hostId || !propertyId) {
      return;
    }
    persistSelectedPropertyId(hostId, propertyId);
  }, [selectedPropertyId]);

  return {
    accommodations,
    isLoadingListings,
    listingsError,
    selectedPropertyId,
    setSelectedPropertyId,
    listingOptions,
  };
};
