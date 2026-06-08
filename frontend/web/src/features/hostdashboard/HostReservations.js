import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import spinner from "../../images/spinnner.gif";
import defaultThumb from "./image22.png";
import { getAccessToken } from "../../services/getAccessToken.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import { updateInquiryStatus } from "./services/reservationService.js";
import { calculateTotalPayment } from "./utils/reservationCalculations.js";
import { usePagination } from "./hooks/usePagination.js";
import { FiSearch } from "react-icons/fi";
import { resolvePrimaryAccommodationImageUrl } from "../guestdashboard/utils/image";
import { fetchPropertySummaries } from "../guestdashboard/services/propertySummaryService";

const normalizeStatus = (status) => {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s === "inquiry") return "INQUIRY";
  if (s === "declined") return "DECLINED";
  if (s.includes("paid")) return "PAID";
  if (s.includes("await")) return "AWAITING_PAYMENT";
  if (s.includes("fail")) return "FAILED";
  return status.toUpperCase();
};

const resolveCancellationType = (cancellationPolicy, rules = []) => {
  if (cancellationPolicy) {
    return cancellationPolicy;
  }
  const match = (rules || []).find(
    (r) => r?.rule?.startsWith("CancellationPolicy:") && (r.value === true || r.value === "true")
  );
  if (match) {
    return match.rule.replace("CancellationPolicy:", "").trim();
  }
  return null;
};

const getPropertiesArray = (data) => {
  if (Array.isArray(data?.response)) {
    return data.response;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

const getReservationsArray = (property) => {
  if (Array.isArray(property.res?.response)) {
    return property.res.response;
  }
  return [];
};

const mapReservations = (data) => {
  const properties = getPropertiesArray(data);

  return properties.flatMap((property) => {
    const reservations = getReservationsArray(property);
    const propertyRules = Array.isArray(property.rules) ? property.rules : [];

    return reservations.map((item) => {
      return {
        property_id: property.id,
        title: property.title,
        rate: property.rate,
        city: property.city,
        country: property.country,
        property_meta: property,
        ...item,
        status: normalizeStatus(item.status),
        cancellationType: resolveCancellationType(item.cancellation_policy, propertyRules),
      };
    });
  });
};

const labelMap = {
  INQUIRY: "Request",
  PAID: "Paid",
  AWAITING_PAYMENT: "Awaiting payment",
  FAILED: "Failed",
  DECLINED: "Declined",
};

const formatDate = (date) => (date ? new Date(date).toLocaleDateString() : "-");

const renderPolicyDisplay = (cancellationType) => {
  if (cancellationType) {
    return <span className={styles.cancellationBadge}>{cancellationType}</span>;
  }
  return <span>-</span>;
};

const mapStatusToClass = (status) => {
  if (status === "INQUIRY") return "statusInquiry";
  if (status === "PAID") return "statusPaid";
  if (status === "AWAITING_PAYMENT") return "statusAwaitingPayment";
  if (status === "FAILED") return "statusFailed";
  if (status === "DECLINED") return "statusDeclined";
  return "statusOther";
};

const resolveImageUrl = (booking) => {
  if (!booking) return defaultThumb;

  const tryGet = (val) => {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") return first.url || first.src || first.path || null;
    }
    if (typeof val === "object") return val.url || val.src || val.path || null;
    return null;
  };

  const prop = booking.property_meta || booking.property || null;
  const propImages = prop?.photos || prop?.images || prop?.media || prop?.gallery || null;
  if (propImages) {
    try {
      const url = resolvePrimaryAccommodationImageUrl(propImages, "thumb");
      if (url) return url;
    } catch (err) {}
  }

  if (booking.property_image_url) {
    return booking.property_image_url;
  }

  const resImages = booking.photos || booking.images || booking.media || booking.gallery || null;
  if (resImages) {
    try {
      const url = resolvePrimaryAccommodationImageUrl(resImages, "thumb");
      if (url) return url;
    } catch (err) {}
  }

  return defaultThumb;
};

const TabButton = ({ tab, activeTab, onSelect, label }) => (
  <button className={activeTab === tab ? styles.active : ""} onClick={() => onSelect(tab)}>
    {label}
  </button>
);

TabButton.propTypes = {
  tab: PropTypes.string.isRequired,
  activeTab: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

const ModalText = ({ overlappingCount }) => {
  if (overlappingCount > 0) {
    const verb = overlappingCount === 1 ? "is" : "are";
    const plural = overlappingCount > 1 ? "s" : "";
    const pronoun = overlappingCount === 1 ? "it" : "them";
    return (
      <p className={styles.modalText}>
        There {verb} <strong>{overlappingCount}</strong> other pending request{plural} for overlapping dates on this
        property. Accepting will automatically decline {pronoun}.
      </p>
    );
  }
  return <p className={styles.modalText}>Are you sure you want to accept this request?</p>;
};

ModalText.propTypes = {
  overlappingCount: PropTypes.number.isRequired,
};

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("ALL");
  const [inquiryLoading, setInquiryLoading] = useState({});
  const [confirmAccept, setConfirmAccept] = useState(null);

  const authToken = useMemo(() => getAccessToken(), []);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const data = await getReservationsFromToken(authToken);
        let properties;
        if (Array.isArray(data?.response)) {
          properties = data.response;
        } else if (Array.isArray(data)) {
          properties = data;
        } else {
          properties = [];
        }
        if (properties.length === 0) {
          setBookings([]);
          return;
        }
        const flat = mapReservations(data);
        setBookings(flat);

        try {
          const missingPropIds = Array.from(
            new Set(
              flat
                .filter((b) => {
                  const prop = b.property_meta || b.property;
                  const hasPropImages =
                    (prop && Array.isArray(prop.photos) && prop.photos.length > 0) ||
                    (prop && Array.isArray(prop.images) && prop.images.length > 0) ||
                    (prop && Array.isArray(prop.media) && prop.media.length > 0) ||
                    (prop && Array.isArray(prop.gallery) && prop.gallery.length > 0);
                  return !hasPropImages && b.property_id;
                })
                .map((b) => b.property_id)
                .filter(Boolean)
            )
          );

          if (missingPropIds.length > 0) {
            const summaries = await fetchPropertySummaries(missingPropIds);
            setBookings((prev) =>
              prev.map((b) => {
                const summary = summaries[b.property_id];
                if (summary && summary.imageUrl) {
                  return { ...b, property_image_url: summary.imageUrl };
                }
                return b;
              })
            );
          }
        } catch (err) {}
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load reservations");
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, [authToken]);

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (activeTab !== "ALL") {
      result = result.filter((b) => b.status === activeTab);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(s) ||
          b.city?.toLowerCase().includes(s) ||
          b.guestname?.toLowerCase().includes(s) ||
          (b.id && String(b.id).includes(s))
      );
    }

    if (range !== "ALL") {
      const now = new Date();
      result = result.filter((b) => {
        const date = new Date(b.arrivaldate || b.createdat);
        const diff = Math.abs((now - date) / 86400000);
        if (range === "7") return diff <= 7;
        if (range === "30") return diff <= 30;
        if (range === "90") return diff <= 90;
        if (range === "365") return diff <= 365;
        return true;
      });
    }

    return result.sort((a, b) => {
      const da = new Date(a.arrivaldate || 0);
      const db = new Date(b.arrivaldate || 0);
      return da - db;
    });
  }, [bookings, activeTab, search, range]);

  const count = (type) => {
    if (type === "ALL") {
      return bookings.length;
    }
    return bookings.filter((b) => b.status === type).length;
  };

  const { currentPage, totalPages, paginatedItems, pageRange, goToPage, goToNextPage, goToPreviousPage } =
    usePagination(filteredBookings, itemsPerPage);

  const pageNumbers = useMemo(() => {
    const count = pageRange.endPage - pageRange.startPage + 1;
    return Array.from({ length: count }, (_, i) => pageRange.startPage + i);
  }, [pageRange]);

  const executeInquiryAction = async (bookingId, action) => {
    setInquiryLoading((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const result = await updateInquiryStatus(bookingId, action, authToken);
      const newStatus = action === "accept-inquiry" ? "AWAITING_PAYMENT" : "DECLINED";
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)));
      if (action === "accept-inquiry") {
        const declined = result?.declinedCount || 0;
        let toastMsg = "Request accepted.";
        if (declined > 0) {
          const suffix = declined > 1 ? "s were" : " was";
          toastMsg = `Request accepted. ${declined} other overlapping request${suffix} automatically declined.`;
        }
        toast.success(toastMsg);
        if (declined > 0) {
          setBookings((prev) =>
            prev.map((b) => (b.id !== bookingId && b.status === "INQUIRY" ? { ...b, status: "DECLINED" } : b))
          );
        }
      } else {
        toast.success("Request declined.");
      }
    } catch {
      toast.error("Failed to update request status.");
    } finally {
      setInquiryLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleInquiryAction = (bookingId, action) => {
    if (action === "accept-inquiry") {
      const booking = bookings.find((b) => b.id === bookingId);
      const overlappingCount = bookings.filter(
        (b) =>
          b.id !== bookingId &&
          b.status === "INQUIRY" &&
          b.property_id === booking?.property_id &&
          b.arrivaldate < booking?.departuredate &&
          b.departuredate > booking?.arrivaldate
      ).length;
      setConfirmAccept({ bookingId, overlappingCount });
    } else {
      executeInquiryAction(bookingId, action);
    }
  };

  return (
    <main className="page-body">
      {isLoading ? (
        <img src={spinner} className={styles.CenterMe} alt="Loading" />
      ) : (
        <div className={styles.container}>
          <h1 className={styles.title}>Reservations</h1>
          <p className={styles.subtitle}>Manage your bookings and guest stays</p>

          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                placeholder="Search guest, property, or reservation ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select className={styles.dropdown} value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="ALL">All</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          <div className={styles.tabs}>
            <TabButton tab="ALL" activeTab={activeTab} onSelect={setActiveTab} label={`All (${count("ALL")})`} />
            <TabButton tab="PAID" activeTab={activeTab} onSelect={setActiveTab} label={`Upcoming (${count("PAID")})`} />
            <TabButton
              tab="AWAITING_PAYMENT"
              activeTab={activeTab}
              onSelect={setActiveTab}
              label={`Awaiting payment (${count("AWAITING_PAYMENT")})`}
            />
            <TabButton
              tab="INQUIRY"
              activeTab={activeTab}
              onSelect={setActiveTab}
              label={`Requests (${count("INQUIRY")})`}
            />
            <TabButton
              tab="FAILED"
              activeTab={activeTab}
              onSelect={setActiveTab}
              label={`Failed (${count("FAILED")})`}
            />
            <TabButton
              tab="DECLINED"
              activeTab={activeTab}
              onSelect={setActiveTab}
              label={`Declined (${count("DECLINED")})`}
            />
          </div>

          <div className={styles.list}>
            <section className={styles.reservationData}>
              <table className={styles.reservationTable}>
                <colgroup>
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th />
                    <th>Property ID</th>
                    <th>Accommodation Name</th>
                    <th>Location</th>
                    <th>Guest Name</th>
                    <th>
                      <span className={styles.headerCell}>
                        Dates <SwapVertIcon className={styles.sortIcon} />
                      </span>
                    </th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Commission</th>
                    <th>Policy</th>
                    <th>Reservation</th>
                    <th>
                      <span className={styles.headerCell}>
                        Booked <SwapVertIcon className={styles.sortIcon} />
                      </span>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td className={styles.noData} colSpan={13}>
                        No reservations yet
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((b) => {
                      const total = calculateTotalPayment(b.rate, b.arrivaldate, b.departuredate);
                      const commission = (total * 0.1).toFixed(2);
                      const isInquiryPending = inquiryLoading[b.id] || false;

                      return (
                        <tr key={`${b.id}-${b.property_id}`}>
                          <td className={styles.thumbnailCell}>
                            <img
                              src={resolveImageUrl(b)}
                              alt={b.title ? `${b.title} image` : "Listing image"}
                              className={styles.thumbnailImage}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultThumb;
                              }}
                            />
                          </td>
                          <td>{b.property_id}</td>
                          <td>{b.title}</td>
                          <td>
                            {b.city}, {b.country}
                          </td>
                          <td>{b.guestname}</td>
                          <td>
                            {formatDate(b.arrivaldate)} - {formatDate(b.departuredate)}
                          </td>
                          <td>
                            <span className={`${styles.status} ${styles[mapStatusToClass(b.status)]}`}>
                              {labelMap[b.status]}
                            </span>
                          </td>
                          <td>€{total}</td>
                          <td>€{commission}</td>
                          <td>{renderPolicyDisplay(b.cancellationType)}</td>
                          <td>{b.id}</td>
                          <td>{formatDate(b.createdat)}</td>
                          <td>
                            {b.status === "INQUIRY" && (
                              <div className={styles.inquiryActions}>
                                <button
                                  className={styles.btnAccept}
                                  disabled={isInquiryPending}
                                  onClick={() => handleInquiryAction(b.id, "accept-inquiry")}>
                                  Accept
                                </button>
                                <button
                                  className={styles.btnDecline}
                                  disabled={isInquiryPending}
                                  onClick={() => handleInquiryAction(b.id, "decline-inquiry")}>
                                  Decline
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </section>

            {filteredBookings.length > 0 && (
              <div className={styles.paginationControls}>
                <button className={styles.paginationButton} onClick={goToPreviousPage} disabled={currentPage === 1}>
                  Previous
                </button>

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    className={`${styles.paginationButton} ${currentPage === p ? styles.activePage : ""}`}
                    onClick={() => goToPage(p)}>
                    {p}
                  </button>
                ))}

                <button
                  className={styles.paginationButton}
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}>
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmAccept && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Accept this request?</h3>
            <ModalText overlappingCount={confirmAccept.overlappingCount} />
            <div className={styles.modalActions}>
              <button
                className={styles.btnAccept}
                onClick={() => {
                  const { bookingId } = confirmAccept;
                  setConfirmAccept(null);
                  executeInquiryAction(bookingId, "accept-inquiry");
                }}>
                Yes, accept
              </button>
              <button className={styles.btnDecline} onClick={() => setConfirmAccept(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default HostReservations;
