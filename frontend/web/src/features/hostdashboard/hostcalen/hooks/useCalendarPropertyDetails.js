import { useEffect, useState } from "react";

import { getAccessToken } from "../../../../services/getAccessToken";
import { PROPERTY_API_BASE } from "../../hostproperty/constants";

export const useCalendarPropertyDetails = ({ selectedPropertyId }) => {
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadPropertyDetails = async () => {
      if (!selectedPropertyId) {
        if (mounted) {
          setPropertyDetails(null);
          setDetailsError("");
          setIsLoadingDetails(false);
        }
        return;
      }

      const token = getAccessToken();
      if (!token) {
        if (mounted) {
          setPropertyDetails(null);
          setDetailsError("Could not load property details. Please sign in again.");
          setIsLoadingDetails(false);
        }
        return;
      }

      setIsLoadingDetails(true);
      setDetailsError("");

      try {
        const response = await fetch(
          `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(selectedPropertyId)}`,
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

        const details = await response.json();

        if (!mounted) {
          return;
        }

        setPropertyDetails(details || null);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setPropertyDetails(null);
        setDetailsError(error?.message || "Could not load listing details.");
      } finally {
        if (mounted) {
          setIsLoadingDetails(false);
        }
      }
    };

    loadPropertyDetails();

    return () => {
      mounted = false;
    };
  }, [selectedPropertyId]);

  return {
    propertyDetails,
    setPropertyDetails,
    isLoadingDetails,
    detailsError,
  };
};
