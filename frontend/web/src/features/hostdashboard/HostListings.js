import React, { useEffect, useMemo, useState } from "react";
import { Auth } from "aws-amplify";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./HostDashboard.module.scss";
import spinner from "../../images/spinnner.gif";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import { getAccessToken } from "../../services/getAccessToken.js";
import { useSetLiveEligibility } from "./hooks/useSetLiveEligibility";
import {
  updatePropertyLifecycleStatus,
} from "./hostproperty/services/hostPropertyApi";

const LISTING_FILTERS = [
  { key: "ACTIVE", label: "Live listings" },
  { key: "INACTIVE", label: "Drafted listings" },
  { key: "ARCHIVED", label: "Archived listings" },
];

const getListingStatus = (accommodation) => String(accommodation?.property?.status || "INACTIVE").toUpperCase();

const getListingImage = (accommodation) => {
  const firstImage = Array.isArray(accommodation?.images) ? accommodation.images[0] : null;
  const imageKey = firstImage?.web_key || firstImage?.key || firstImage?.thumb_key || firstImage?.original_key || "";
  return imageKey ? `https://accommodation.s3.eu-north-1.amazonaws.com/${imageKey}` : "";
};

const getStatusLabel = (status) => {
  if (status === "ACTIVE") {
    return "Live";
  }
  if (status === "ARCHIVED") {
    return "Archived";
  }
  return "Drafted";
};

const LISTING_ACTIONS = {
  ACTIVE: [
    { id: "details", label: "Details", kind: "details" },
    { id: "edit", label: "Edit", kind: "edit" },
  ],
  INACTIVE: [
    {
      id: "set-live",
      label: "Set as live",
      kind: "status",
      nextStatus: "ACTIVE",
      successMessage: "Listing set to Live.",
    },
    { id: "edit", label: "Edit", kind: "edit" },
  ],
  ARCHIVED: [
    {
      id: "set-draft",
      label: "Set as draft",
      kind: "status",
      nextStatus: "INACTIVE",
      successMessage: "Listing restored to Draft.",
    },
    {
      id: "set-live",
      label: "Set as live",
      kind: "status",
      nextStatus: "ACTIVE",
      successMessage: "Listing restored to Live.",
    },
    { id: "edit", label: "Edit", kind: "edit" },
  ],
};

const createListingActionClickHandler = (action, onActionClick) => (event) => {
  event.stopPropagation();
  onActionClick(action);
};

function HostListingCardActions({ actions, isBusy, onActionClick }) {
  return (
    <div className={styles.buttonBox}>
      {actions.map((action) => (
        <button
          key={action.id}
          className={styles.greenBtn}
          onClick={createListingActionClickHandler(action, onActionClick)}
          disabled={isBusy}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

HostListingCardActions.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      kind: PropTypes.oneOf(["details", "edit", "status"]).isRequired,
      nextStatus: PropTypes.string,
      successMessage: PropTypes.string,
    })
  ).isRequired,
  isBusy: PropTypes.bool.isRequired,
  onActionClick: PropTypes.func.isRequired,
};

function HostListings() {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ACTIVE");
  const [processingPropertyId, setProcessingPropertyId] = useState("");
  const navigate = useNavigate();
  const { liveEligibility, liveEligibilityError, liveEligibilityLoading, fetchVerificationStatus } =
    useSetLiveEligibility({ userId });

  useEffect(() => {
    const setUserIdAsync = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo?.attributes?.sub || null);
      } catch (error) {
        console.error("Error setting user id:", error);
      }
    };

    setUserIdAsync();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchVerificationStatus();
      fetchAccommodations().catch(console.error);
    }
  }, [userId]);

  const fetchAccommodations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
        {
          method: "GET",
          headers: {
            Authorization: getAccessToken(),
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch host properties.");
      }
      const data = await response.json();
      setAccommodations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error(error?.message || "Failed to load listings.");
    } finally {
      setIsLoading(false);
    }
  };

  const listingsByStatus = useMemo(() => {
    const grouped = {
      ACTIVE: [],
      INACTIVE: [],
      ARCHIVED: [],
    };

    accommodations.forEach((accommodation) => {
      const status = getListingStatus(accommodation);
      if (!grouped[status]) {
        grouped.INACTIVE.push(accommodation);
        return;
      }
      grouped[status].push(accommodation);
    });

    return grouped;
  }, [accommodations]);

  const visibleListings = listingsByStatus[activeFilter] || [];

  const ensureLiveEligibility = async (propertyId) => {
    if (!userId) {
      throw new Error("Host user is not loaded.");
    }
    if (liveEligibilityLoading) {
      throw new Error("Checking verification status. Please try again in a moment.");
    }
    if (liveEligibilityError) {
      throw new Error(liveEligibilityError);
    }
    if (!liveEligibility) {
      navigate("/verify", {
        state: {
          userId,
          accommodationId: propertyId,
        },
      });
      return false;
    }
    return true;
  };

  const changeListingStatus = async ({ propertyId, nextStatus, successMessage }) => {
    if (!propertyId || !nextStatus) {
      return;
    }

    if (nextStatus === "ACTIVE") {
      const canProceed = await ensureLiveEligibility(propertyId);
      if (!canProceed) {
        return;
      }
    }

    setProcessingPropertyId(propertyId);
    try {
      await updatePropertyLifecycleStatus({ propertyId, status: nextStatus });
      toast.success(successMessage);
      await fetchAccommodations();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update listing status.");
    } finally {
      setProcessingPropertyId("");
    }
  };

  const executeListingAction = (action, propertyId) => {
    if (action.kind === "details") {
      navigate(`/listingdetails?ID=${propertyId}`);
      return;
    }
    if (action.kind === "edit") {
      navigate(`/hostdashboard/property?ID=${propertyId}`);
      return;
    }
    if (action.kind === "status") {
      void changeListingStatus({
        propertyId,
        nextStatus: action.nextStatus,
        successMessage: action.successMessage,
      });
    }
  };

  const renderListingsContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loader}>
          <img src={spinner} alt="Loading..." />
        </div>
      );
    }

    if (visibleListings.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>No listings found in this section.</p>
        </div>
      );
    }

    return (
      <div className={styles.cardsGrid}>
        {visibleListings.map((accommodation, index) => {
          const propertyId = accommodation?.property?.id || "";
          const propertyStatus = getListingStatus(accommodation);
          const statusLabel = getStatusLabel(propertyStatus);
          const propertyTitle = accommodation?.property?.title || "Untitled listing";
          const propertyCity = accommodation?.location?.city || "Unknown city";
          const propertyImage = getListingImage(accommodation);
          const isBusy = processingPropertyId === propertyId;
          const actions = LISTING_ACTIONS[propertyStatus] || [];
          const handleListingActionClick = (action) => executeListingAction(action, propertyId);

          return (
            <div
              key={propertyId || index}
              className={styles.dashboardCard}
              onClick={() => {
                if (propertyStatus === "ACTIVE") {
                  navigate(`/listingdetails?ID=${propertyId}`);
                  return;
                }
                navigate(`/hostdashboard/property?ID=${propertyId}`);
              }}
            >
              {propertyImage ? (
                <img src={propertyImage} alt="Listing" className={styles.imgListedDashboard} />
              ) : (
                <div className={styles.imgListedDashboardFallback}>No image</div>
              )}

              <div className={styles.accommodationText}>
                <p className={styles.accommodationTitle}>{propertyTitle}</p>
                <p className={styles.accommodationLocation}>{propertyCity}</p>
              </div>

              <div className={styles.accommodationDetails}>
                <span
                  className={`${styles.status} ${propertyStatus === "ARCHIVED" ? styles.isArchived : ""}`}
                >
                  {statusLabel}
                </span>
                <span>On: {DateFormatterDD_MM_YYYY(accommodation?.property?.createdAt)}</span>
              </div>

              <HostListingCardActions
                actions={actions}
                isBusy={isBusy}
                onActionClick={handleListingActionClick}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="page-Host">
      <p className="page-Host-title">Listings</p>

      <div className="page-Host-content">
        <section className="host-pc-dashboard">
          <div className={styles.dashboardHost}>
            <div className={styles.hostListingContainer}>
              <div className={styles.listingBody}>
                <div className={styles.buttonBox}>
                  <button className={styles.greenBtn} onClick={() => navigate("/hostonboarding")}>
                    Add new accommodation
                  </button>
                  <button className={styles.greenBtn} onClick={fetchAccommodations}>
                    Refresh
                  </button>
                </div>

                <section className={styles.listingsDisplay}>
                  <div className={styles.listingFilters}>
                    {LISTING_FILTERS.map((filterOption) => {
                      const count = listingsByStatus[filterOption.key]?.length || 0;
                      const isActive = activeFilter === filterOption.key;
                      return (
                        <button
                          key={filterOption.key}
                          type="button"
                          className={`${styles.listingFilterButton} ${isActive ? styles.listingFilterButtonActive : ""}`}
                          onClick={() => setActiveFilter(filterOption.key)}
                          disabled={isLoading}
                        >
                          {filterOption.label} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <p className={styles.header}>{LISTING_FILTERS.find((item) => item.key === activeFilter)?.label}</p>

                  {renderListingsContent()}
                </section>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HostListings;
