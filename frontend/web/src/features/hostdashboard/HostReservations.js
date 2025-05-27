import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Pages from "./Pages.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import EventIcon from "@mui/icons-material/Event";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import getReservationsFromToken from "./services/getReservationsFromToken";
import BooleanToString from "./services/booleanToString.js";
import { getAccessToken } from "../../services/getAccessToken.js";
import pageSwitcherStyling from "../../utils/PageSwitcher.module.css";
import { Auth } from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import ReservationItem from "../../utils/ReservationItem";

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userHasReservations, setUserHasReservations] = useState(false);
  const [bookings, setBooking] = useState(null);
  const [sortedBookings, setSortedBookings] = useState(null);
  const authToken = getAccessToken();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookings = await getReservationsFromToken(authToken);
        console.log(bookings);
        if (bookings === "Data not found") {
          toast.error("No reservations found for this user.");
          setUserHasReservations(false);
          return;
        } else {
          setBooking(bookings);
          setSortedBookings(sortBookings(null, bookings));
          setUserHasReservations(true);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const sortBookings = (type, bookings) => {
    let bookingArray = [];  
    bookings.forEach((property) => {
      property.items.forEach((item) => {
        bookingArray.push(item);
      });
    });
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
            <Pages />
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
                <button onClick={() => sortBookings("Cancelled", bookings)}>Cancelled</button>
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
                          <td className={styles.singleReservationRow}>test</td>
                          <td className={styles.singleReservationRow}>
                            {new Date(booking.arrivalDate).toLocaleDateString()} -{" "}
                            {new Date(booking.departureDate).toLocaleDateString()}
                          </td>
                          <td className={styles.singleReservationRow}>
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </td>
                          <td className={styles.singleReservationRow}>wip</td>
                          <td className={styles.singleReservationRow}>€200</td>
                          <td className={styles.singleReservationRow}>{BooleanToString(booking.latePayment)}</td>
                          <td className={styles.singleReservationRow}>{booking.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className={styles.noData}>No reservations found.</td>
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