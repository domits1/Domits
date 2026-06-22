import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import useEffectiveHostId from "../../hooks/useEffectiveHostId";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./HostListings.module.scss";
import spinner from "../../images/spinnner.gif";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import {
  resolveAccommodationImageUrl,
  resolveAccommodationImageKey,
} from "../../utils/accommodationImage";
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
  if (!resolveAccommodationImageKey(firstImage, "thumb")) {
    return "";
  }
  return resolveAccommodationImageUrl(firstImage, "thumb");
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
    { id: "edit", label: "Edit", kind: "edit" },
  ],
};

const createListingActionClickHandler = (action, onActionClick) => (event) => {
  event.stopPropagation();
  onActionClick(action);
};

function HostListingCardActions({ actions, isBusy, onActionClick }) {
  return (
    <div className={styles.cardButtons}>
      {actions.map((action) => (
        <button
          key={action.id}
          className={
            action.id === "edit"
              ? styles.secondaryBtn
              : styles.greenBtn
          }
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
  const [activeFilter, setActiveFilter] = useState("ACTIVE");
  const [processingPropertyId, setProcessingPropertyId] = useState("");
  const navigate = useNavigate();
  const { effectiveHostId: userId, ownId, managedHostId, isPurelyPOM } = useEffectiveHostId();
  const { liveEligibility, liveEligibilityError, liveEligibilityLoading, fetchVerificationStatus } =
    useSetLiveEligibility({ userId: ownId });

  useEffect(() => {
    if (userId) {
      fetchVerificationStatus();
      fetchAccommodations();
    }
  }, [fetchVerificationStatus, userId, managedHostId, isPurelyPOM]);

  const fetchFromByHostId = async (hostId) => {
    try {
      const response = await fetch(
        `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/byHostId?hostId=${hostId}`,
        { method: "GET", headers: { Authorization: getAccessToken() } }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const fetchAccommodations = async () => {
    setIsLoading(true);
    try {
      let data = [];

      if (isPurelyPOM) {
        data = await fetchFromByHostId(userId);
      } else if (managedHostId) {
        const [ownResponse, managedResponse] = await Promise.all([
          fetch(
            "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
            { method: "GET", headers: { Authorization: getAccessToken() } }
          ),
          fetchFromByHostId(managedHostId),
        ]);
        const ownData = ownResponse.ok ? await ownResponse.json() : [];
        data = [...(Array.isArray(ownData) ? ownData : []), ...managedResponse];
      } else {
        const response = await fetch(
          "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
          { method: "GET", headers: { Authorization: getAccessToken() } }
        );
        if (!response.ok) throw new Error("Failed to fetch host properties.");
        const raw = await response.json();
        data = Array.isArray(raw) ? raw : [];
      }

      setAccommodations(data);
    } catch (error) {

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

  const ensureLiveEligibility = () => {
    if (!userId) {
      toast.error("User is not loaded. Please refresh and try again.");
      return false;
    }
    if (liveEligibilityLoading) {
      toast.info("Checking verification status. Please try again in a moment.");
      return false;
    }
    if (liveEligibilityError || !liveEligibility) {
      toast.error("You need to complete your bank details before you can publish this listing. Redirecting to finance...");
      navigate("/hostdashboard/finance");
      return false;
    }
    return true;
  };

  const changeListingStatus = async ({ propertyId, nextStatus, successMessage }) => {
    if (!propertyId || !nextStatus) {
      return;
    }

    if (nextStatus === "ACTIVE") {
      const canProceed = ensureLiveEligibility();
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
          const actions = isPurelyPOM ? [] : (LISTING_ACTIONS[propertyStatus] || []);
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

      <div className="page-Host-content">
        <section className="host-pc-dashboard">
          <div className={styles.dashboardHost}>
            <div className={styles.hostListingContainer}>
              <div className={styles.listingBody}>
                <div className={styles.topHeader}>
                  <h2 className={styles.pageTitle}>Listings</h2>
                  {!isPurelyPOM && (
                    <button className={styles.greenBtn} onClick={() => navigate("/hostonboarding")}>
                      + Add property
                    </button>
                  )}
                </div>

                <div className={styles.tabsNav}>
                    {LISTING_FILTERS.map((filterOption) => {
                      const count = listingsByStatus[filterOption.key]?.length || 0;
                      const isActive = activeFilter === filterOption.key;
                      return (
                        <button
                          key={filterOption.key}
                          type="button"
                          className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
                          onClick={() => setActiveFilter(filterOption.key)}
                          disabled={isLoading}
                        >
                          {filterOption.label} ({count})
                        </button>
                      );
                    })}
                </div>

                <section className={styles.listingsDisplay}>

                  {/* <p className={styles.header}>{LISTING_FILTERS.find((item) => item.key === activeFilter)?.label}</p> */}

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
