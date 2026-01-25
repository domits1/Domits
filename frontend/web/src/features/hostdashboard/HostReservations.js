import EventIcon from "@mui/icons-material/Event";
import FilterListIcon from "@mui/icons-material/FilterList";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import spinner from "../../images/spinnner.gif";
import { getAccessToken } from "../../services/getAccessToken.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import BooleanToString from "./services/booleanToString.js";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import { calculateTotalPayment } from "./utils/reservationCalculations.js";
import { usePagination } from "./hooks/usePagination.js";
import filterReservations from "./utils/filterReservations.js";

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userHasReservations, setUserHasReservations] = useState(false);
  const [bookings, setBooking] = useState(null);
  const [sortedBookings, setSortedBookings] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const authToken = getAccessToken();
  const itemsPerPage = 10;
  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const filteredBookings = useMemo(
    () => filterReservations(sortedBookings || [], searchTerm),
    [sortedBookings, searchTerm]
  );

  const { currentPage, totalPages, paginatedItems, pageRange, goToPage, goToNextPage, goToPreviousPage } =
    usePagination(filteredBookings || [], itemsPerPage);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookings = await getReservationsFromToken(authToken);
        if (bookings === "Data not found") {
          toast.error("No reservations found for this user. Refresh the page to try again.");
          setUserHasReservations(false);
        } else {
          setBooking(bookings);
          setSortedBookings();
          setUserHasReservations(true);
          sortBookings(null, bookings);
        }
      } catch (error) {
        console.error("Error fetching properties:", error);
        toast.error(
          "Something unexpected happened. You possibly don't have any reservations. Please refresh the page to try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const sortBookings = (type, bookings) => {
    if (!bookings || bookings.length === 0) {
      setSortedBookings([]);
      return;
    }

    let bookingArray = [];

    bookings.forEach((property) => {
      const reservations = Array.isArray(property.res?.response) ? property.res.response : [];

      reservations.forEach((item) => {
        bookingArray.push({
          property_id: property.id,
          title: property.title,
          rate: property.rate,
          city: property.city,
          country: property.country,
          ...item,
        });
      });
    });
    if (type === null) {
      setSortedBookings(bookingArray);
    } else {
      setSortedBookings(bookingArray.filter((booking) => booking.status === type));
    }
    goToPage(1);
  };

  const mapStatusToClass = (status) => {
    if (!status) return "statusOther";
    const normalized = String(status).toLowerCase();
    if (normalized === "paid") return "statusPaid";
    if (normalized === "awaiting payment" || normalized === "awaiting_payment") return "statusAwaitingPayment";
    if (normalized === "failed") return "statusFailed";
    return "statusOther";
  };

  const shouldShowPagination = userHasReservations && sortedBookings && sortedBookings.length > 0;

  const pageNumbers = useMemo(() => {
    if (!shouldShowPagination) return [];
    const count = pageRange.endPage - pageRange.startPage + 1;
    return Array.from({ length: count }, (_, i) => pageRange.startPage + i);
  }, [shouldShowPagination, pageRange]);

  return (
    <main className="page-body">
      {isLoading ? (
        <img src={spinner} className={styles.CenterMe}></img>
      ) : (
        <>
          <section className={styles.reservationContainer}>
            <section className={styles.reservationContent}>
              <div className={styles.reservationInfo}>
                <h2>Manage Reservations</h2>
                <p>
                  <EventIcon />
                  You can manage your reservations on your properties here.
                </p>
              </div>
              <div className={styles.controlsRow}>
                <div className={styles.reservationButtons}>
                  <button onClick={() => sortBookings(null, bookings)}>All</button>
                  <button onClick={() => sortBookings("Paid", bookings)}>Paid</button>
                  <button onClick={() => sortBookings("Awaiting Payment", bookings)}>Awaiting Payment</button>
                  <button onClick={() => sortBookings("Failed", bookings)}>Failed</button>
                </div>
                <div className={styles.searchWrap}>
                  <input
                    type="search"
                    placeholder="Search by property, city, guest or id..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                  />
                </div>
              </div>
              <section className={styles.reservationData}>
                <table className={styles.reservationTable}>
                  <thead>
                    <tr>
                      <th>
                        Property ID
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Accommodation Name
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Location
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Guest Name
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Check In - Check Out
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Status
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Total Payment
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Commission
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Reservation Number
                        <span className={styles.reservationIcons}></span>
                      </th>
                      <th>
                        Booked On
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shouldShowPagination ? (
                      paginatedItems.map((booking) => (
                        <tr key={booking.id}>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>{booking.property_id}</span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>{booking.title}</span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>
                              {booking.city}, {booking.country}
                            </span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>{booking.guestname}</span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>
                              {new Date(booking.arrivaldate).toLocaleDateString()} -{" "}
                              {new Date(booking.departuredate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={`${styles.status} ${styles[mapStatusToClass(booking.status)]}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>
                              €{calculateTotalPayment(booking.rate, booking.arrivaldate, booking.departuredate)}
                            </span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>
                              €
                              {(
                                calculateTotalPayment(booking.rate, booking.arrivaldate, booking.departuredate) * 0.1
                              ).toFixed(2)}
                            </span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>{booking.id}</span>
                          </td>
                          <td className={styles.singleReservationRow}>
                            <span className={styles.cellContent}>
                              {new Date(booking.createdat).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={styles.noData} colSpan={10}>
                          You currently have no reservations for your accommodation(s). Refresh the page to try again.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
              {shouldShowPagination && (
                <div className={styles.paginationControls}>
                  <button
                    className={styles.paginationButton}
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    aria-label="Previous page">
                    Previous
                  </button>
                  {pageNumbers.map((pageIndex) => (
                    <button
                      key={pageIndex}
                      className={`${styles.paginationButton} ${currentPage === pageIndex ? styles.activePage : ""}`}
                      onClick={() => goToPage(pageIndex)}
                      aria-label={`Go to page ${pageIndex}`}>
                      {pageIndex}
                    </button>
                  ))}
                  <button
                    className={styles.paginationButton}
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    aria-label="Next page">
                    Next
                  </button>
                </div>
              )}
            </section>
          </section>
        </>
      )}
    </main>
  );
};

export default HostReservations;