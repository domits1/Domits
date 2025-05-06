import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import Pages from "./Pages.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import EventIcon from "@mui/icons-material/Event";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import getReservationsFromToken from "./services/getReservationsFromToken";
import { getAccessToken } from "../../services/getAccessToken.js";
import pageSwitcherStyling from "../../utils/PageSwitcher.module.css";
import info from "../../images/icons/info.png";
import { Auth } from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import ReservationItem from "../../utils/ReservationItem";
import chevron from "../../images/icons/sort-solid.svg";

const HostReservations = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [bookings, setBooking] = useState(null);
  const notify = () => toast(toastMessage); 
  const authToken = getAccessToken();
  

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookings = await getReservationsFromToken(authToken);
        console.log(bookings);
        setBooking(bookings);
        toast.success(`Gathered ${bookings.length} reservations!`, {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
          });
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setIsLoading(false);

      }

    };

    fetchBookings();
  }, []);

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
                <div>
                  <button onClick={notify}>Notify!</button>
                  <ToastContainer />
                </div>
              </div>
              <div className={styles.reservationButtons}>
                <button>All</button>
                <button>Incoming</button>
                <button>Accepted</button>
                <button>Cancelled</button>
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
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className={styles.singleReservationRow}>{booking.id}</td>
                        <td className={styles.singleReservationRow}>in the property-table</td>
                        <td className={styles.singleReservationRow}>
                          {new Date(booking.arrivalDate).toLocaleDateString()} - {new Date(booking.departureDate).toLocaleDateString()}
                        </td>
                        <td className={styles.singleReservationRow}>
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </td>
                        <td className={styles.singleReservationRow}>test</td>
                        <td className={styles.singleReservationRow}>€420</td>
                        <td className={styles.singleReservationRow}>{booking.latePayment} true/false</td>
                        <td className={styles.singleReservationRow}>{booking.status}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className={styles.singleReservationRow}>1241254211</td>
                      <td className={styles.singleReservationRow}>Discover unique views in t-</td>
                      <td className={styles.singleReservationRow}>April 29 - May 0-</td>
                      <td className={styles.singleReservationRow}>April 26</td>
                      <td className={styles.singleReservationRow}>Mike</td>
                      <td className={styles.singleReservationRow}>€821</td>
                      <td className={styles.singleReservationRow}>Yes</td>
                      <td className={styles.singleReservationRow}>Accepted</td>
                    </tr>
                    <tr>
                      <td className={styles.singleReservationRow}>1241254215125</td>
                      <td className={styles.singleReservationRow}>Discover unique views in t-</td>
                      <td className={styles.singleReservationRow}>April 29 - May 0-</td>
                      <td className={styles.singleReservationRow}>April 26</td>
                      <td className={styles.singleReservationRow}>Mike</td>
                      <td className={styles.singleReservationRow}>€821</td>
                      <td className={styles.singleReservationRow}>Yes</td>
                      <td className={styles.singleReservationRow}>Accepted</td>
                    </tr>
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
