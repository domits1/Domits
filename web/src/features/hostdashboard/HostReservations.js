import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import styles from "../../styles/sass/hostdashboard/hostreservations.module.scss"
import EventIcon from '@mui/icons-material/Event';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import pageSwitcherStyling from "../../utils/PageSwitcher.module.css";
import info from "../../images/icons/info.png";
import {Auth} from "aws-amplify";
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
                        <p><EventIcon />You can manage your reservations on your properties here.</p>
                    </div>
                    <div className={styles.reservationButtons}>
                        <button>All</button>
                        <button>Incoming</button>
                        <button>Accepted</button>
                        <button>Cancelled</button>
                    </div>
                    <section className={styles.reservationSortBox}>
                        <section className={styles.reservationBarTop}> {/* sort from high to low/low to high */}
                            <button>Reservation Id<span className={styles.icon}><span className={styles.icon}><SwapVertIcon /></span></span></button>
                            <button>Accommodation name<span className={styles.icon}><SwapVertIcon /></span></button>
                            <button>Reserved dates<span className={styles.icon}><FilterListIcon /></span></button>
                            <button>Requested on<span className={styles.icon}><FilterListIcon /></span></button>
                            <button>Guest name<span className={styles.icon}><SwapVertIcon /></span></button>
                            <button>Rate<span className={styles.icon}><SwapVertIcon /></span></button>
                            <button>Payed<span className={styles.icon}><SwapVertIcon /></span></button>
                            <button>Status<span className={styles.icon}><SwapVertIcon /></span></button>
                        </section>
                    </section>
                    <section className={styles.reservationData}>
                        <div className={styles.reservationBar1}> {/* Reservation Id */}
                            <p>1241254215125</p>
                        </div>
                        <div className={styles.reservationBar2}> {/* Accommodation name */}
                            <p>Discover unique views in the world of boilerplate code! Experience STUNNING views while sipping on an nice beer!</p>
                        </div>
                        <div className={styles.reservationBar3}> {/* Reserved dates */}
                            <p>April 29 - May 02, 2025</p>
                        </div>
                        <div className={styles.reservationBar4}> {/* Requested on */}
                            <p>April 26</p>
                        </div>
                        <div className={styles.reservationBar5}> {/* Guest name */}
                            <p>Mike</p>
                        </div>
                        <div className={styles.reservationBar6}> {/* Rate */}
                            <p>€821</p>
                        </div>
                        <div className={styles.reservationBar7}> {/* Payed */}
                            <p>Yes</p>
                        </div>
                        <div className={styles.reservationBar8}> {/* Status */}
                            <p>Accepted</p>
                        </div>
                    </section>
                </section>
            </section>
        </main>
    );
}

export default HostReservations;
