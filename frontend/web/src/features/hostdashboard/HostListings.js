import React, { useEffect, useMemo, useState } from "react";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Housekeeping.css";
import styles from "./HostDashboard.module.scss";
import spinner from "../../images/spinnner.gif";
import { FiArchive, FiTrash2,  FiMapPin, FiInfo } from "react-icons/fi";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import {
  resolveAccommodationImageUrl,
  resolveAccommodationImageKey,
} from "../../utils/accommodationImage";
import { getAccessToken } from "../../services/getAccessToken.js";
import { useSetLiveEligibility } from "./hooks/useSetLiveEligibility";
import { updatePropertyLifecycleStatus, deletePropertyListing } from "./hostproperty/services/hostPropertyApi";

const LISTING_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Live" },
  { key: "INACTIVE", label: "Draft" },
  { key: "ARCHIVED", label: "Archived" },
];

const getListingStatus = (a) =>
  String(a?.property?.status || "INACTIVE").toUpperCase();

const getListingImage = (a) => {
  const img = Array.isArray(a?.images) ? a.images[0] : null;
  if (!resolveAccommodationImageKey(img, "thumb")) return "";
  return resolveAccommodationImageUrl(img, "thumb");
};

const getStatusLabel = (status) => {
  if (status === "ACTIVE") return "Live";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
};

const LISTING_ACTIONS = {
  ACTIVE: [
    { id: "edit", label: "Edit", kind: "edit" },
    { id: "unpublish", label: "Unpublish", kind: "status", nextStatus: "INACTIVE" },
  ],
  INACTIVE: [
    { id: "set-live", label: "Set as live", kind: "status", nextStatus: "ACTIVE" },
    { id: "edit", label: "Edit", kind: "edit" },
  ],
  ARCHIVED: [
    { id: "restore", label: "Restore", kind: "status", nextStatus: "INACTIVE" },
    { id: "edit", label: "Edit", kind: "edit" },
  ],
};

function HostListings() {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [processingPropertyId, setProcessingPropertyId] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null); 

  const navigate = useNavigate();

  const { liveEligibility, liveEligibilityLoading, fetchVerificationStatus } =
    useSetLiveEligibility({ userId });

  useEffect(() => {
    Auth.currentUserInfo().then((u) =>
      setUserId(u?.attributes?.sub || null)
    );
  }, []);

  useEffect(() => {
    if (userId) {
      fetchVerificationStatus();
      fetchAccommodations();
    }
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchAccommodations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
        { headers: { Authorization: getAccessToken() } }
      );
      const data = await res.json();
      setAccommodations(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load listings");
    } finally {
      setIsLoading(false);
    }
  };

  const listingsByStatus = useMemo(() => {
    const g = { ACTIVE: [], INACTIVE: [], ARCHIVED: [] };
    accommodations.forEach((a) => g[getListingStatus(a)]?.push(a));
    return g;
  }, [accommodations]);

  const visibleListings =
    activeFilter === "ALL"
      ? accommodations
      : listingsByStatus[activeFilter] || [];

  const changeStatus = async (propertyId, nextStatus) => {
    if (nextStatus === "ACTIVE" && !liveEligibility && !liveEligibilityLoading) {
      navigate("/verify");
      return;
    }

    setProcessingPropertyId(propertyId);

    try {
      await updatePropertyLifecycleStatus({
        propertyId,
        status: nextStatus,
      });
      await fetchAccommodations();
    } catch {
      toast.error("Failed to update");
    } finally {
      setProcessingPropertyId("");
    }
  };

  const handleAction = (action, id) => {
    if (action.kind === "edit")
      return navigate(`/hostdashboard/property?ID=${id}`);

    if (action.kind === "status")
      return changeStatus(id, action.nextStatus);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;

    try {
      await deletePropertyListing({ propertyId: id });

      toast.success("Deleted successfully");
      fetchAccommodations();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Are you sure you want to archive this listing?")) return;

    try {
      await updatePropertyLifecycleStatus({
        propertyId: id,
        status: "ARCHIVED",
      });
      fetchAccommodations();
    } catch {
      toast.error("Archive failed");
    }
  };

  const renderListingsContent = () => {
    if (isLoading) {
      return (
        <div className="loading">
          <img src={spinner} alt="Loading..." />
        </div>
      );
    }

    if (visibleListings.length === 0) {
      return <div className="empty-state">No listings found.</div>;
    }

    return (
      <div className={styles.listingsContainer}>
        <div className={styles.listingsGrid}>
          {visibleListings.map((a) => {
            const id = a?.property?.id;
            const status = getListingStatus(a);

            return (
              <div key={id} className={styles.listingCard}>
                <img
                  src={getListingImage(a)}
                  className={styles.listingImage}
                  alt=""
                />

                <div className={styles.cardContent}>
                  <div className={styles.row}>
                    <h3 className={styles.title}>{a?.property?.title}</h3>

                    <span
                      className={`${styles.badge} ${
                        status === "ACTIVE"
                          ? styles.live
                          : status === "INACTIVE"
                          ? styles.draft
                          : styles.archived
                      }`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  <div className={styles.divider} />

                  <div className={styles.row}>
                    <span className={styles.location}>
                      <FiMapPin/> {a?.location?.city}
                    </span>
                  </div>

                  <div className={styles.divider} />

                  {status === "ARCHIVED" ? (
                    <>
                      <div className={styles.row}>
                        <span className={styles.meta}>
                          Archived on: {DateFormatterDD_MM_YYYY(a?.property?.updatedAt)}
                        </span>
                      </div>
                
                     <div className={styles.archivedInfo}>
                      <FiInfo />
                        This listing is archived and no longer visible or bookable.
                      </div>
                        </>
                      ) : (
                        <div className={styles.row}>
                          <span className={styles.meta}>
                            Created on: {DateFormatterDD_MM_YYYY(a?.property?.createdAt)}
                          </span>
                        </div>
                      )
                    }

                  <div className={styles.actionsRow}>
                    {(LISTING_ACTIONS[status] || []).map((action) => (
                      <button
                        key={action.id}
                        className={
                          action.id === "set-live"
                            ? styles.primaryBtn
                            : styles.secondaryBtn
                        }
                        onClick={() => handleAction(action, id)}
                      >
                        {action.label}
                      </button>
                    ))}

                    {/* DROPDOWN */}
                    <div className={styles.dropdownWrapper}>
                      <button
                        className={styles.moreBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === id ? null : id);
                        }}
                      >
                        •••
                      </button>

                      {openMenuId === id && (
                        <div className={styles.dropdownMenu}>
                          {status !== "ARCHIVED" && (
                            <button
                              className={styles.dropdownItem}
                              onClick={() => {
                                setOpenMenuId(null);
                                handleArchive(id);
                              }}
                            >
                              <FiArchive/> Archive
                            </button>
                          )}

                          <button
                            className={`${styles.dropdownItem} ${styles.delete}`}
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDelete(id);
                            }}
                          >
                            <FiTrash2/> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <div className="task-dashboard-v2">
          <div className="top-header">
            <h2>Listings</h2>

            <button
              className="btn-create-green"
              onClick={() => navigate("/hostonboarding")}
            >
              + Add property
            </button>
          </div>

          <div className="tabs-nav">
            {LISTING_FILTERS.map((f) => {
              const count =
                f.key === "ALL"
                  ? accommodations.length
                  : listingsByStatus[f.key]?.length || 0;

              return (
                <button
                  key={f.key}
                  className={`tab-btn ${
                    activeFilter === f.key ? "active" : ""
                  }`}
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>

          {renderListingsContent()}
        </div>
      </div>
    </main>
  );
}

export default HostListings;