import SwapVertIcon from "@mui/icons-material/SwapVert";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import spinner from "../../images/spinnner.gif";
import { getAccessToken } from "../../services/getAccessToken.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import { updateInquiryStatus } from "./services/reservationService.js";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import { usePagination } from "./hooks/usePagination.js";
import { resolvePrimaryAccommodationImageUrl } from "../guestdashboard/utils/image";
import { fetchPropertySummaries } from "../guestdashboard/services/propertySummaryService";
import { calculateTotalPayment } from "./utils/reservationCalculations.js";

const normalizeStatus = (status) => {
  if (!status) return "";

  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "inquiry") return "INQUIRY";
  if (normalizedStatus === "declined") return "DECLINED";
  if (normalizedStatus.includes("paid")) return "PAID";
  if (normalizedStatus.includes("await")) return "AWAITING_PAYMENT";
  if (normalizedStatus.includes("fail")) return "FAILED";

  return status.toUpperCase();
};

const resolveCancellationType = (cancellationPolicy, rules = []) => {
  if (cancellationPolicy) {
    return cancellationPolicy;
  }

  const matchingRule = (rules || []).find(
    (rule) => rule?.rule?.startsWith("CancellationPolicy:") && (rule?.value === true || rule?.value === "true")
  );

  if (matchingRule) {
    return matchingRule.rule.replace("CancellationPolicy:", "").trim();
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

    return reservations.map((reservation) => ({
      property_id: property.id,
      title: property.title,
      rate: property.rate,
      city: property.city,
      country: property.country,
      property_meta: property,
      property: property,
      images: property.photos || property.images || [],
      ...reservation,
      status: normalizeStatus(reservation.status),
      cancellationType: resolveCancellationType(reservation.cancellation_policy, propertyRules),
    }));
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

const isOverlappingInquiry = (candidateBooking, targetBooking) => {
  if (!candidateBooking || !targetBooking) {
    return false;
  }

  return (
    candidateBooking.id !== targetBooking.id &&
    candidateBooking.status === "INQUIRY" &&
    candidateBooking.property_id === targetBooking.property_id &&
    candidateBooking.arrivaldate < targetBooking.departuredate &&
    candidateBooking.departuredate > targetBooking.arrivaldate
  );
};

const resolveImageUrl = (booking) => {
  const prop = booking?.property_meta || booking?.property || null;
  const propImages = prop?.photos || prop?.images || prop?.media || prop?.gallery || null;
  if (propImages) {
    try {
      const url = resolvePrimaryAccommodationImageUrl(propImages, "thumb");
      if (url) return url;
    } catch (err) {
      console.warn("Failed to resolve property image:", err);
    }
  }

  if (booking?.property_image_url) {
    return booking.property_image_url;
  }

  const resImages = booking?.photos || booking?.images || booking?.media || booking?.gallery || null;
  if (resImages) {
    try {
      const url = resolvePrimaryAccommodationImageUrl(resImages, "thumb");
      if (url) return url;
    } catch (err) {
      console.warn("Failed to resolve reservation image:", err);
    }
  }

  return null;
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
        There {verb} <strong>{overlappingCount}</strong> other pending request
        {plural} for overlapping dates on this property. Accepting will automatically decline {pronoun}.
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
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [inquiryLoading, setInquiryLoading] = useState({});
  const [confirmAccept, setConfirmAccept] = useState(null);

  const navigate = useNavigate();
  const authToken = useMemo(() => getAccessToken(), []);
  const itemsPerPage = 10;

  const openReservationDetails = (booking) => {
    const reservationId = String(booking?.id || "").trim();
    if (!reservationId) {
      return;
    }

    navigate(`/hostdashboard/reservations/${encodeURIComponent(reservationId)}`, {
      state: {
        booking,
      },
    });
  };

  const handleReservationRowKeyDown = (event, booking) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openReservationDetails(booking);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const updateBookingsWithSummaries = (prev, summaries) => {
    return prev.map((b) => {
      const summary = summaries[b.property_id];
      if (!summary) return b;

      const updated = { ...b };

      if (summary?.imageUrl) {
        updated.property_image_url = summary.imageUrl;
      }

      if (!updated.title && summary?.title) {
        updated.title = summary.title;
      }

      if ((!updated.city || !updated.country) && (summary?.city || summary?.country)) {
        updated.city = updated.city || summary.city || "";
        updated.country = updated.country || summary.country || "";
      }

      return updated;
    });
  };

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);

      try {
        const data = await getReservationsFromToken(authToken);
        const properties = getPropertiesArray(data);

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
                  const prop = b.property_meta || b.property || {};
                  const hasPropImages =
                    (Array.isArray(prop?.photos) && prop.photos.length > 0) ||
                    (Array.isArray(prop?.images) && prop.images.length > 0) ||
                    (Array.isArray(prop?.media) && prop.media.length > 0) ||
                    (Array.isArray(prop?.gallery) && prop.gallery.length > 0) ||
                    Boolean(b.property_image_url);

                  const hasTitle = Boolean(b.title || prop.title || prop.name);
                  const hasCity = Boolean(b.city || prop?.city || prop?.location?.city);

                  // fetch summaries when images, title or city are missing
                  return (!hasPropImages || !hasTitle || !hasCity) && b.property_id;
                })
                .map((b) => b.property_id)
                .filter(Boolean)
            )
          );

          if (missingPropIds.length > 0) {
            const summaries = await fetchPropertySummaries(missingPropIds);
            setBookings((prev) => updateBookingsWithSummaries(prev, summaries));
          }
        } catch (err) {
          console.warn("Failed to fetch property summaries:", err);
        }
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
      result = result.filter((booking) => booking.status === activeTab);
    }

    if (search) {
      const normalizedSearch = search.toLowerCase();

      result = result.filter(
        (booking) =>
          booking.title?.toLowerCase().includes(normalizedSearch) ||
          booking.city?.toLowerCase().includes(normalizedSearch) ||
          booking.guestname?.toLowerCase().includes(normalizedSearch) ||
          (booking.id && String(booking.id).includes(normalizedSearch))
      );
    }

    if (range !== "ALL") {
      const now = new Date();

      result = result.filter((booking) => {
        const bookingDate = new Date(booking.arrivaldate || booking.createdat);
        const differenceInDays = Math.abs((now - bookingDate) / 86400000);

        if (range === "7") return differenceInDays <= 7;
        if (range === "30") return differenceInDays <= 30;
        if (range === "90") return differenceInDays <= 90;
        if (range === "365") return differenceInDays <= 365;

        return true;
      });
    }

    return result.sort((bookingA, bookingB) => {
      if (!sortField) {
        const arrivalDateA = new Date(bookingA.arrivaldate || 0);
        const arrivalDateB = new Date(bookingB.arrivaldate || 0);

        return arrivalDateA - arrivalDateB;
      }

      let valueA;
      let valueB;

      if (sortField === "dates") {
        valueA = new Date(bookingA.arrivaldate || 0);
        valueB = new Date(bookingB.arrivaldate || 0);
      }

      if (sortField === "booked") {
        valueA = new Date(bookingA.createdat || 0);
        valueB = new Date(bookingB.createdat || 0);
      }

      if (!valueA || !valueB) {
        return 0;
      }

      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    });
  }, [bookings, activeTab, search, range, sortField, sortDirection]);

  const count = (type) => {
    if (type === "ALL") {
      return bookings.length;
    }

    return bookings.filter((booking) => booking.status === type).length;
  };

  const { currentPage, totalPages, paginatedItems, pageRange, goToPage, goToNextPage, goToPreviousPage } =
    usePagination(filteredBookings, itemsPerPage);

  const pageNumbers = useMemo(() => {
    const visiblePageCount = pageRange.endPage - pageRange.startPage + 1;

    return Array.from({ length: visiblePageCount }, (_, index) => pageRange.startPage + index);
  }, [pageRange]);

  const executeInquiryAction = async (bookingId, action) => {
    setInquiryLoading((currentState) => ({
      ...currentState,
      [bookingId]: true,
    }));

    try {
      const result = await updateInquiryStatus(bookingId, action, authToken);
      const nextStatus = action === "accept-inquiry" ? "AWAITING_PAYMENT" : "DECLINED";
      const declinedCount = result?.declinedCount || 0;

      setBookings((currentBookings) => {
        const targetBooking = currentBookings.find((booking) => booking.id === bookingId);

        return currentBookings.map((booking) => {
          if (booking.id === bookingId) {
            return { ...booking, status: nextStatus };
          }

          if (action === "accept-inquiry" && declinedCount > 0 && isOverlappingInquiry(booking, targetBooking)) {
            return { ...booking, status: "DECLINED" };
          }

          return booking;
        });
      });

      if (action === "accept-inquiry") {
        if (declinedCount > 0) {
          const suffix = declinedCount > 1 ? "s were" : " was";

          toast.success(
            `Request accepted. ${declinedCount} other overlapping request${suffix} automatically declined.`
          );
        } else {
          toast.success("Request accepted.");
        }
      } else {
        toast.success("Request declined.");
      }
    } catch {
      toast.error("Failed to update request status.");
    } finally {
      setInquiryLoading((currentState) => ({
        ...currentState,
        [bookingId]: false,
      }));
    }
  };

  const handleInquiryAction = (bookingId, action) => {
    if (action !== "accept-inquiry") {
      executeInquiryAction(bookingId, action);
      return;
    }

    const targetBooking = bookings.find((booking) => booking.id === bookingId);
    const overlappingCount = bookings.filter((booking) => isOverlappingInquiry(booking, targetBooking)).length;

    setConfirmAccept({ bookingId, overlappingCount });
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
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <select className={styles.dropdown} value={range} onChange={(event) => setRange(event.target.value)}>
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
              <div className={styles.tableWrapper}>
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
                        <button className={styles.sortButton} onClick={() => handleSort("dates")}>
                          <span className={styles.headerCell}>
                            Dates
                            <SwapVertIcon className={styles.sortIcon} />
                          </span>
                        </button>
                      </th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Commission</th>
                      <th>Policy</th>
                      <th>Reservation</th>
                      <th>
                        <button className={styles.sortButton} onClick={() => handleSort("booked")}>
                          <span className={styles.headerCell}>
                            Booked
                            <SwapVertIcon className={styles.sortIcon} />
                          </span>
                        </button>
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
                      paginatedItems.map((booking) => {
                        const total = calculateTotalPayment(booking.rate, booking.arrivaldate, booking.departuredate);
                        const commission = (total * 0.1).toFixed(2);
                        const isInquiryPending = inquiryLoading[booking.id] || false;

                        return (
                          <tr
                            key={`${booking.id}-${booking.property_id}`}
                            className={styles.reservationRow}
                            role="button"
                            tabIndex={0}
                            aria-label={`Open reservation ${booking.id}`}
                            onClick={() => openReservationDetails(booking)}
                            onKeyDown={(event) => handleReservationRowKeyDown(event, booking)}>
                            <td className={styles.thumbnailCell} data-label="Image">
                              {resolveImageUrl(booking) ? (
                                <img
                                  src={resolveImageUrl(booking)}
                                  alt={booking.title ? `${booking.title} image` : "Listing image"}
                                  className={styles.thumbnailImage}
                                />
                              ) : (
                                <div className={styles.thumbnailPlaceholder}>No Image</div>
                              )}
                            </td>
                            <td data-label="Property ID">{booking.property_id}</td>
                            <td data-label="Accommodation Name">{booking.title}</td>
                            <td data-label="Location">
                              {booking.city}, {booking.country}
                            </td>
                            <td data-label="Guest Name">{booking.guestname}</td>
                            <td data-label="Dates">
                              {formatDate(booking.arrivaldate)} - {formatDate(booking.departuredate)}
                            </td>
                            <td data-label="Status">
                              <span className={`${styles.status} ${styles[mapStatusToClass(booking.status)]}`}>
                                {labelMap[booking.status]}
                              </span>
                            </td>
                            <td data-label="Total">€{total}</td>
                            <td data-label="Commission">€{commission}</td>
                            <td data-label="Policy">{renderPolicyDisplay(booking.cancellationType)}</td>
                            <td data-label="Reservation">
                              <button
                                type="button"
                                className={styles.reservationLinkButton}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openReservationDetails(booking);
                                }}>
                                {booking.id}
                              </button>
                            </td>
                            <td data-label="Booked">{formatDate(booking.createdat)}</td>
                            <td data-label="Actions">
                              {booking.status === "INQUIRY" && (
                                <div className={styles.inquiryActions}>
                                  <button
                                    type="button"
                                    className={styles.btnAccept}
                                    disabled={isInquiryPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleInquiryAction(booking.id, "accept-inquiry");
                                    }}>
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.btnDecline}
                                    disabled={isInquiryPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleInquiryAction(booking.id, "decline-inquiry");
                                    }}>
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
              </div>
            </section>

            {filteredBookings.length > 0 && (
              <div className={styles.paginationControls}>
                <button className={styles.paginationButton} onClick={goToPreviousPage} disabled={currentPage === 1}>
                  Previous
                </button>

                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`${styles.paginationButton} ${currentPage === pageNumber ? styles.activePage : ""}`}
                    onClick={() => goToPage(pageNumber)}>
                    {pageNumber}
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

      {confirmAccept ? (
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
      ) : null}
    </main>
  );
};

export default HostReservations;
