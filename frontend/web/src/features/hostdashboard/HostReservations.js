import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import EventIcon from "@mui/icons-material/Event";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import getReservationsFromToken from "./services/getReservationsFromToken.js";
import BooleanToString from "./services/booleanToString.js";
import { getAccessToken } from "../../services/getAccessToken.js";
import spinner from "../../images/spinnner.gif";

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
          setSortedBookings(  );
          setUserHasReservations(true);
          sortBookings(null, bookings);
        }
       } catch (error) {
        console.error("Error fetching properties:", error);
        toast.error("Something unexpected happenend. You possibly don't have any reservations. Please refresh the page to try again.")
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

      reservations.forEach((item) =>{
        bookingArray.push({
          title: property.title,
          rate: property.rate,
          id: property.id,
          ...item
        })
      })

    })
    if (type === null) {
      setSortedBookings(bookingArray);
    } else {
      setSortedBookings(bookingArray.filter((booking) => booking.status === type));
    }
  };

  return (
    <main className="page-body">
      {isLoading ? (
        <img src={spinner} className={styles.CenterMe}></img>
      ) : (
        <>
          <h2>Reservations</h2>
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
                        Reservation Id
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Accommodation name
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Reserved dates
                        <span className={styles.reservationIcons}>
                          <FilterListIcon />
                        </span>
                      </th>
                      <th>
                        Requested on
                        <span className={styles.reservationIcons}>
                          <FilterListIcon />
                        </span>
                      </th>
                      <th>
                        Guest name
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Rate
                        <span className={styles.reservationIcons}>
                          <SwapVertIcon />
                        </span>
                      </th>
                      <th>
                        Payed
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
                    </tr>
                  </thead>
                  <tbody>
                    {userHasReservations && sortedBookings && sortedBookings.length > 0 ? (
                      sortedBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td className={styles.singleReservationRow}>{booking.id}</td>
                          <td className={styles.singleReservationRow}>{booking.title}</td>
                          <td className={styles.singleReservationRow}>
                            {new Date(booking.arrivaldate).toLocaleDateString()} -{" "}
                            {new Date(booking.departuredate).toLocaleDateString()}
                          </td>
                          <td className={styles.singleReservationRow}>
                            {new Date(booking.createdat).toLocaleDateString()}
                          </td>
                          <td className={styles.singleReservationRow}>{booking.guestname}</td>
                          <td className={styles.singleReservationRow}>€{booking.rate}</td>
                          <td className={styles.singleReservationRow}>{BooleanToString(booking.latePayment)}</td>
                          <td className={styles.singleReservationRow}>{booking.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={styles.noData} colSpan={8}>You currently have no reservations for your accommodation(s). Refresh the page to try again.</td>
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
