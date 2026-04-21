import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import spinner from "../../images/spinnner.gif";
import { getAccessToken } from "../../services/getAccessToken.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import { calculateTotalPayment } from "./utils/reservationCalculations.js";
import { usePagination } from "./hooks/usePagination.js";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const normalizeStatus = (status) => {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("paid")) return "PAID";
  if (s.includes("await")) return "AWAITING_PAYMENT";
  if (s.includes("fail")) return "FAILED";
  return status.toUpperCase();
};

const mapReservations = (data) => {
  return data.flatMap((property) => {
    const reservations = Array.isArray(property.res?.response)
      ? property.res.response
      : [];
    return reservations.map((item) => ({
      property_id: property.id,
      title: property.title,
      rate: property.rate,
      city: property.city,
      country: property.country,
      ...item,
      status: normalizeStatus(item.status),
    }));
  });
};

const labelMap = {
  PAID: "Paid",
  AWAITING_PAYMENT: "Awaiting payment",
  FAILED: "Failed",
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString() : "-";

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("ALL");
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const navigate = useNavigate();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const authToken = useMemo(() => getAccessToken(), []);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const data = await getReservationsFromToken(authToken);
        if (!Array.isArray(data) || data.length === 0) {
          setBookings([]);
          return;
        }

        const flat = mapReservations(data);
        setBookings(flat);
        } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to load reservations"
        );
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
      if (!sortField) {
        const da = new Date(a.arrivaldate || 0);
        const db = new Date(b.arrivaldate || 0);
        return da - db;
      }

      let valueA, valueB;

      if (sortField === "dates") {
        valueA = new Date(a.arrivaldate || 0);
        valueB = new Date(b.arrivaldate || 0);
      }

      if (sortField === "booked") {
        valueA = new Date(a.createdat || 0);
        valueB = new Date(b.createdat || 0);
      }

      if (!valueA || !valueB) return 0;

      return sortDirection === "asc"
        ? valueA - valueB
       : valueB - valueA;
    });
  }, [bookings, activeTab, search, range, sortField, sortDirection]);

  const count = (type) =>
    bookings.filter((b) => (type === "ALL" ? true : b.status === type)).length;

  const {
    currentPage,
    totalPages,
    paginatedItems,
    pageRange,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  } = usePagination(filteredBookings, itemsPerPage);

  const pageNumbers = useMemo(() => {
    const count = pageRange.endPage - pageRange.startPage + 1;
    return Array.from({ length: count }, (_, i) => pageRange.startPage + i);
  }, [pageRange]);

  const mapStatusToClass = (status) => {
    if (status === "PAID") return "statusPaid";
    if (status === "AWAITING_PAYMENT") return "statusAwaitingPayment";
    if (status === "FAILED") return "statusFailed";
    return "statusOther";
  };

  return (
    <main className="page-body">
      {isLoading ? (
        <img src={spinner} className={styles.CenterMe} alt="Loading" />
      ) : (
        <div className={styles.container}>
          <h1 className={styles.title}>Reservations</h1>
          <p className={styles.subtitle}>
            Manage your bookings and guest stays
          </p>

          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                placeholder="Search guest, property, or reservation ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className={styles.dropdown}
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          <div className={styles.tabs}>
            <button
              className={activeTab === "ALL" ? styles.active : ""}
              onClick={() => setActiveTab("ALL")}
            >
              All ({count("ALL")})
            </button>
            <button
              className={activeTab === "PAID" ? styles.active : ""}
              onClick={() => setActiveTab("PAID")}
            >
              Upcoming ({count("PAID")})
            </button>
            <button
              className={
                activeTab === "AWAITING_PAYMENT" ? styles.active : ""
              }
              onClick={() => setActiveTab("AWAITING_PAYMENT")}
            >
              Awaiting payment ({count("AWAITING_PAYMENT")})
            </button>
            <button
              className={activeTab === "FAILED" ? styles.active : ""}
              onClick={() => setActiveTab("FAILED")}
            >
              Failed ({count("FAILED")})
            </button>
          </div>

          <div className={styles.list}>
            <section className={styles.reservationData}>
              <div className={styles.tableWrapper}>
                <table className={styles.reservationTable}>
                  <thead>
                    <tr>
                      <th>Property ID</th>
                      <th>Accommodation Name</th>
                      <th>Location</th>
                      <th>Guest Name</th>
                      <th
                        onClick={() => handleSort("dates")}
                        style={{ cursor: "pointer" }}
                      >
                        <span className={styles.headerCell}>
                          Dates <SwapVertIcon className={styles.sortIcon} />
                        </span>
                      </th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Commission</th>
                      <th>Reservation</th>
                      <th
                        onClick={() => handleSort("booked")}
                        style={{ cursor: "pointer" }}
                      >
                        <span className={styles.headerCell}>
                          Booked <SwapVertIcon className={styles.sortIcon} />
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td className={styles.noData} colSpan={10}>
                          No reservations yet
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((b) => {
                        const total = calculateTotalPayment(
                          b.rate,
                          b.arrivaldate,
                          b.departuredate
                        );
                        const commission = (total * 0.1).toFixed(2);

                        return (
                          <tr
                            key={`${b.id}-${b.property_id}`}
                            onClick={() =>
                              navigate(`${b.id}`, {
                                state: { booking: b },
                              })
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <td data-label="Property ID">{b.property_id}</td>
                            <td data-label="Accommodation Name">{b.title}</td>
                            <td data-label="Location">
                              {b.city}, {b.country}
                            </td>
                            <td data-label="Guest Name">{b.guestname}</td>
                            <td data-label="Dates">
                              {formatDate(b.arrivaldate)} -{" "}
                              {formatDate(b.departuredate)}
                            </td>
                            <td data-label="Status">
                              <span
                                className={`${styles.status} ${
                                  styles[mapStatusToClass(b.status)]
                                }`}
                              >
                                {labelMap[b.status]}
                              </span>
                            </td>
                            <td data-label="Total">€{total}</td>
                            <td data-label="Commission">€{commission}</td>
                            <td data-label="Reservation">{b.id}</td>
                            <td data-label="Booked">
                              {formatDate(b.createdat)}
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
                <button
                  className={styles.paginationButton}
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    className={`${styles.paginationButton} ${
                      currentPage === p ? styles.activePage : ""
                    }`}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  className={styles.paginationButton}
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
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