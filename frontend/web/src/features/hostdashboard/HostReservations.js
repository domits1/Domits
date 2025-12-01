import EventIcon from "@mui/icons-material/Event";
import FilterListIcon from "@mui/icons-material/FilterList";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import spinner from "../../images/spinnner.gif";
import { getAccessToken } from "../../services/getAccessToken.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import BooleanToString from "./services/booleanToString.js";
import getReservationsFromToken from "./services/getReservationsFromToken.js";

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userHasReservations, setUserHasReservations] = useState(false);
  const [bookings, setBooking] = useState(null);
  const [sortedBookings, setSortedBookings] = useState(null);
  const authToken = getAccessToken();

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
          "Something unexpected happenend. You possibly don't have any reservations. Please refresh the page to try again."
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
          title: property.title,
          rate: property.rate,
          id: property.id,
          ...item,
        });
      });
    });
    if (type === null) {
      setSortedBookings(bookingArray);
    } else {
      setSortedBookings(bookingArray.filter((booking) => booking.status === type));
    }
  };

  const calculateNights = (arrival, departure) => {
    try {
      const msPerDay = 1000 * 60 * 60 * 24;
      const arrivalMs = Number(arrival);
      const departureMs = Number(departure);
      if (Number.isNaN(arrivalMs) || Number.isNaN(departureMs)) return 1;
      const diff = departureMs - arrivalMs;
      const nights = Math.max(1, Math.round(diff / msPerDay));

      return nights;
    } catch (e) {
      return 1;
    }
  };

  const calculateTotalPayment = (rate, arrival, departure) => {
    const nights = calculateNights(arrival, departure);
    const numericRate = Number(rate) || 0;
    return numericRate * nights;
  };

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
              <div className={styles.reservationButtons}>
                <button onClick={() => sortBookings(null, bookings)}>All</button>
                <button onClick={() => sortBookings("Paid", bookings)}>Paid</button>
                <button onClick={() => sortBookings("Awaiting Payment", bookings)}>Awaiting Payment</button>
                <button onClick={() => sortBookings("Failed", bookings)}>Failed</button>
              </div>
              <section className={styles.reservationData}>
                <table className={styles.reservationTable}>
                  <thead>
                    <tr>
                      <th>
                        Property ID
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Accommodation Name
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Location
                        <span className={styles.reservationIcons}>
                          <FilterListIcon />
                        </span>
                      </th>
                      <th>
                        Guest Name
                        <span className={styles.reservationIcons}>
                          <FilterListIcon />
                        </span>
                      </th>
                      <th>
                        Check-In - Check-Out
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Status
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Total Payment
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Commission
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Reservation Number
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
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
                    {userHasReservations && sortedBookings && sortedBookings.length > 0 ? (
                      sortedBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className={styles.singleReservationRow}>{booking.property_id}</td>
                          <td className={styles.singleReservationRow}>{booking.title}</td>
                          <td className={styles.singleReservationRow}>
                            {booking.city}, {booking.country}
                          </td>
                          <td className={styles.singleReservationRow}>{booking.guestname}</td>
                          <td className={styles.singleReservationRow}>
                            {new Date(booking.arrivaldate).toLocaleDateString()} -{" "}
                            {new Date(booking.departuredate).toLocaleDateString()}
                          </td>
                          <td className={styles.singleReservationRow}>{booking.status}</td>
                          <td className={styles.singleReservationRow}>
                            €{calculateTotalPayment(booking.rate, booking.arrivaldate, booking.departuredate)}
                          </td>
                          <td className={styles.singleReservationRow}>
                            €
                            {(
                              calculateTotalPayment(booking.rate, booking.arrivaldate, booking.departuredate) * 0.1
                            ).toFixed(2)}
                          </td>
                          <td className={styles.singleReservationRow}>{BooleanToString(booking.id)}</td>
                          <td className={styles.singleReservationRow}>
                            {new Date(booking.createdat).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={styles.noData} colSpan={8}>
                          You currently have no reservations for your accommodation(s). Refresh the page to try again.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            </section>
          </section>
        </>
      )}
    </main>
  );
};

export default HostReservations;
