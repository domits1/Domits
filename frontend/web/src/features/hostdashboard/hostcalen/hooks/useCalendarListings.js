import { useEffect, useMemo, useState } from "react";

import { getAccessToken, getCognitoUserId } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";
import {
  buildListingOptions,
  persistSelectedPropertyId,
  readPersistedSelectedPropertyId,
} from "./hostCalendarHelpers";

const resolveListingPropertyId = (listing) => String(listing?.property?.id || "");

const hasListing = (listings, propertyId) =>
  Boolean(propertyId) && listings.some((listing) => resolveListingPropertyId(listing) === propertyId);

const resolveSelectedPropertyId = ({ currentPropertyId, persistedPropertyId, listings }) => {
  if (hasListing(listings, currentPropertyId)) {
    return currentPropertyId;
  }
  if (hasListing(listings, persistedPropertyId)) {
    return persistedPropertyId;
  }
  return resolveListingPropertyId(listings?.[0]);
};

const buildFallbackListingsUrl = (hostId) => {
  const fallbackUrl = new URL(`${PROPERTY_API_BASE}/bookingEngine/byHostId`);
  fallbackUrl.searchParams.set("hostId", hostId);
  return fallbackUrl.toString();
};

const fetchListingsFromHostDashboard = async (token) => {
  const response = await fetch(`${PROPERTY_API_BASE}/hostDashboard/all`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });
  const status = response.status;
  if (!response.ok) {
    return {
      listings: null,
      status,
    };
  }
  const data = await response.json();
  return {
    listings: Array.isArray(data) ? data : [],
    status,
  };
};

const fetchListingsByHostId = async ({ hostId, token, fallbackStatus }) => {
  if (!hostId) {
    throw new Error(`Could not load listings (${fallbackStatus}).`);
  }
  const response = await fetch(buildFallbackListingsUrl(hostId), {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });
  if (!response.ok) {
    throw new Error(`Could not load listings (${response.status}).`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchHostListings = async ({ hostId, token }) => {
  const primaryResult = await fetchListingsFromHostDashboard(token);
  if (primaryResult.listings) {
    return primaryResult.listings;
  }
  return fetchListingsByHostId({
    hostId,
    token,
    fallbackStatus: primaryResult.status,
  });
};

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
        const listings = await fetchHostListings({ hostId, token });

        if (!mounted) {
          return;
        }

        setAccommodations(listings);

        const persistedPropertyId = readPersistedSelectedPropertyId(hostId);
        setSelectedPropertyId((currentPropertyId) => {
          return resolveSelectedPropertyId({
            currentPropertyId,
            persistedPropertyId,
            listings,
          });
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
