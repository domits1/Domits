import React from "react";
import back from '../../images/arrowleft.png';
import { Link } from "react-router-dom";
import bookarrow from "../../images/whitearrow.png"
import arrow from "../../images/arrow.svg"
import "./listingdetails.css";

const BookingDetails = () => {
    return (
        <main className="booking-details-section">
            <div className="booking-details-text">Booking details</div>
            {/* div met text hoort niet */}
            <article className="booking-details-card">
                <article className="listing-details-check-container">
                    <div className="listing-details-checkin-text">Check in</div>
                    <div className="listing-details-checkout-text">Check out</div>
                </article>
                <article className="listing-details-dates-container">
                    <div className="listing-details-checkin-date">15 december 2023</div>
                    <div className="listing-details-amount-of-nights-text">
                        7<br />
                        <img src={arrow} alt="Arrow" />
                        Nights
                    </div>
                    <div className="listing-details-checkout-date">23 december 2023</div>
                </article>
                <article className="listing-details-guests-pets-container">
                    <div className="listing-details-guests-text">Guests</div>
                    <div className="listing-details-pets-text">Pets</div>
                </article>
                <article className="listing-details-guests-pets-content">
                    <div className="listing-details-amount-of-adults">2 adults</div>
                    <div className="listing-details-amount-of-kids">2 kids</div>
                    <div className="listing-details-select">Select...</div>
                </article>
                <article className="listing-details-book-button">
                    <Link to={`/bookingoverview`}>
                        <button>Book* <img src={bookarrow} alt="Book Arrow" /></button>
                    </Link>
                </article>
                <div className="listing-details-book-button-star-text">*You wont be charged yet</div>
                {/*  Horizontal line  */}
                <hr />
                <article className="listing-details-booking-information-section">
                    <article className="listing-details-booking-information-row">
                        <div className="listing-details-booking-information-text">7 nights x $1400 a night</div>
                        <div className="listing-details-booking-information-text">$9800</div>
                    </article>
                    <article className="listing-details-booking-information-row">
                        <div className="listing-details-booking-information-text">Season booking discount</div>
                        <div className="listing-details-booking-information-text">-$75</div>
                    </article>
                    <article className="listing-details-booking-information-row">
                        <div className="listing-details-booking-information-text">Cleaning fee</div>
                        <div className="listing-details-booking-information-text">$100</div>
                    </article>
                    <article className="listing-details-booking-information-row">
                        <div className="listing-details-booking-information-text">Domits service fee</div>
                        <div className="listing-details-booking-information-text">$98</div>
                    </article>
                    <article className="listing-details-booking-information-row">
                        <div className="listing-details-booking-total-text">Total</div>
                        <div className="listing-details-booking-total-price">$9923</div>
                    </article>
                </article>
            </article>
        </main>
    );
}

export default BookingDetails;