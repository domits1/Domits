import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import spinner from "../../images/spinnner.gif";
import { getAccessToken } from "../../services/getAccessToken.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import { updateInquiryStatus } from "./services/reservationService.js";
import { calculateTotalPayment } from "./utils/reservationCalculations.js";
import { usePagination } from "./hooks/usePagination.js";
import { FiSearch } from "react-icons/fi";

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
        ...item,
        status: normalizeStatus(item.status),
        cancellationType: resolveCancellationType(item.cancellation_policy, propertyRules),
      };
    });
  });
};

const labelMap = {
  INQUIRY: "Inquiry",
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

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("ALL");
  const [inquiryLoading, setInquiryLoading] = useState({});

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

  const handleInquiryAction = async (bookingId, action) => {
    setInquiryLoading((prev) => ({ ...prev, [bookingId]: true }));
    try {
      await updateInquiryStatus(bookingId, action, authToken);
      const newStatus = action === "accept-inquiry" ? "AWAITING_PAYMENT" : "DECLINED";
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      toast.success(
        action === "accept-inquiry" ? "Inquiry accepted." : "Inquiry declined."
      );
    } catch {
      toast.error("Failed to update inquiry status.");
    } finally {
      setInquiryLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const mapStatusToClass = (status) => {
    if (status === "INQUIRY") return "statusInquiry";
    if (status === "PAID") return "statusPaid";
    if (status === "AWAITING_PAYMENT") return "statusAwaitingPayment";
    if (status === "FAILED") return "statusFailed";
    if (status === "DECLINED") return "statusDeclined";
    return "statusOther";
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
            <button className={activeTab === "ALL" ? styles.active : ""} onClick={() => setActiveTab("ALL")}>
              All ({count("ALL")})
            </button>
            <button className={activeTab === "PAID" ? styles.active : ""} onClick={() => setActiveTab("PAID")}>
              Upcoming ({count("PAID")})
            </button>
            <button
              className={activeTab === "AWAITING_PAYMENT" ? styles.active : ""}
              onClick={() => setActiveTab("AWAITING_PAYMENT")}>
              Awaiting payment ({count("AWAITING_PAYMENT")})
            </button>
            <button className={activeTab === "FAILED" ? styles.active : ""} onClick={() => setActiveTab("FAILED")}>
              Failed ({count("FAILED")})
            </button>
            <button
              className={activeTab === "DECLINED" ? styles.active : ""}
              onClick={() => setActiveTab("DECLINED")}
            >
              Declined ({count("DECLINED")})
            </button>
          </div>

          <div className={styles.list}>
            <section className={styles.reservationData}>
              <table className={styles.reservationTable}>
                <colgroup>
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
                      <td className={styles.noData} colSpan={11}>
                        No reservations yet
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((b) => {
                      const total = calculateTotalPayment(b.rate, b.arrivaldate, b.departuredate);
                      const commission = (total * 0.1).toFixed(2);
                      const isInquiryPending =
                        inquiryLoading[b.id] || false;

                      return (
                        <tr key={`${b.id}-${b.property_id}`}>
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
                          <td>
                            {renderPolicyDisplay(b.cancellationType)}
                          </td>
                          <td>{b.id}</td>
                          <td>{formatDate(b.createdat)}</td>
                          <td>
                            {b.status === "INQUIRY" && (
                              <div className={styles.inquiryActions}>
                                <button
                                  className={styles.btnAccept}
                                  disabled={isInquiryPending}
                                  onClick={() =>
                                    handleInquiryAction(
                                      b.id,
                                      "accept-inquiry"
                                    )
                                  }
                                >
                                  Accept
                                </button>
                                <button
                                  className={styles.btnDecline}
                                  disabled={isInquiryPending}
                                  onClick={() =>
                                    handleInquiryAction(
                                      b.id,
                                      "decline-inquiry"
                                    )
                                  }
                                >
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
    </main>
  );
};

export default HostReservations;
