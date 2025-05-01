import React, { useEffect, useState } from "react";
import Pages from "./Pages.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss";
import EventIcon from "@mui/icons-material/Event";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import pageSwitcherStyling from "../../utils/PageSwitcher.module.css";
import info from "../../images/icons/info.png";
import { Auth } from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import ReservationItem from "../../utils/ReservationItem";
import chevron from "../../images/icons/sort-solid.svg";

const HostReservations = () => {
  return (
    <main className="page-body">
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
                            <span className={styles.reservationIcons}><SwapVertIcon /></span>
                        </th>
                        <th>
                            Accommodation name
                            <span className={styles.reservationIcons}><SwapVertIcon /></span>
                        </th>
                        <th>
                            Reserved dates
                            <span className={styles.reservationIcons}><FilterListIcon /></span>
                        </th>
                        <th>
                            Requested on
                            <span className={styles.reservationIcons}><FilterListIcon /></span>
                        </th>
                        <th>
                            Guest name
                            <span className={styles.reservationIcons}><SwapVertIcon /></span>
                        </th>
                        <th>
                            Rate
                            <span className={styles.reservationIcons}><SwapVertIcon /></span>
                        </th>
                        <th>
                            Payed
                            <span className={styles.reservationIcons}><SwapVertIcon /></span>
                        </th>
                        <th>
                            Status
                            <span className={styles.reservationIcons}><SwapVertIcon /></span>
                        </th>
                    </tr>
                </thead>
                <tbody>
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
    </main>
  );
};

export default HostReservations;
