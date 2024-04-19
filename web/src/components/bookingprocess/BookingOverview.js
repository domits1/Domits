import backarrow from "../../images/arrowleft.png";
import bookingimage1 from "../../images/accobigimg.png";
import bookingimage2 from "../../images/adultacco.png";
import bookingimage3 from "../../images/accoimg4.png";
import bookingimage4 from "../../images/accoimg3.png";
import bookingimage5 from "../../images/accoimg1.png";
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { id } from '../../components/hostdashboard/Accommodations.js';
import './BookingOverview.css';

const BookingOverview = () => {
    return (
        <main className="booking-container">
            <section className="back-arrow">
                <a href="/details">
                    <img src={backarrow} alt="Back Arrow"/>
                </a>
            </section>
            <section className="image-section">
                <img src={bookingimage1} alt="Booking Image 1" className="booking-image1"/>
                <article className="imageWindow">
                    <img src={bookingimage2} alt="Booking Image 2"/>
                    <img src={bookingimage3} alt="Booking Image 3"/>
                    <img src={bookingimage4} alt="Booking Image 4" className="booking-image4"/>
                    <img src={bookingimage5} alt="Booking Image 5" className="booking-image5"/>
                </article>
            </section>
            <section className="info-section">
                <article className="title-section">
                    <div className="section-titles">Minimalistic and cozy place in Haarlem</div>
                    <div className="booking-subtitle">Fantastic villa with private swimming pool and surrounded by
                        beautiful parks.
                    </div>

                    {/* Divs met text kan niet nog aanpassen */}
                </article>
                <section className="horizontal-sections">
                    <section className="dates-section">
                        <div className="section-titles">Dates</div>
                    {/* Divs met text kan niet nog aanpassen */}
                        <article className="date-guest-wrapper">
                            <div className="small-information-text">05/12/2023 - 08/12/2023</div>
                            <a href="#" className="change-link">Change</a>
                        </article>
                    </section>
                    <section className="guests-section">
                        <div className="section-titles">Guests</div>
                    {/* Divs met text kan niet nog aanpassen */}
                        <article className="date-guest-wrapper">
                            <div className="small-information-text">2 adults - 2 kids</div>
                            <a href="#" className="change-link">Change</a>
                        </article>
                    </section>
                    <section className="extra-cleaning-section">
                        <div className="section-titles">Extra cleaning</div>
                    {/* Divs met text kan niet nog aanpassen */}
                        <article className="date-guest-wrapper">
                            <div className="small-information-text">Select if needed</div>
                    {/* Divs met text kan niet nog aanpassen */}
                            <input className="extraCleaningCheckbox" type="checkbox"/>
                        </article>
                    </section>
                </section>
                <section className="booking-overview-section">
                    <div className="section-titles">Booking overview</div>
                    {/* Divs met text kan niet nog aanpassen */}
                    <div className="small-information-text">05/12/2023 - 08/12/2023</div>
                    <section className="details-row">
                        <section className="left-column">
                            <section className="row">
                                <span className="detail">Main booker:</span>
                            </section>
                            <section className="row">
                                <span className="detail">Amount of guests:</span>
                            </section>
                            <section className="row">
                                <span className="detail">Email address:</span>
                            </section>
                            <section className="row">
                                <span className="detail">Phone number:</span>
                            </section>
                        </section>
                        <section className="right-column">
                            <section className="row">
                                <span>Lotte Summer</span>
                            </section>
                            <section className="row">
                                <span>2 adults - 2 kids</span>
                            </section>
                            <section className="row">
                                <span>lotte_summer@gmail.com</span>
                            </section>
                            <section className="row">
                                <span>+31673282829</span>
                            </section>
                        </section>
                    </section>
                    <hr/>
                    <section className="details-row">
                        <section className="left-column">
                            <section className="row">
                                <span className="accommodation-detail">Accommodation</span>
                            </section>
                        </section>
                        <section className="right-column">
                            <section className="row">
                                <span className="accommodation-detail">Kinderhuissingel 6k</span>
                            </section>
                            <a href="#" className="more-information-link">More information</a>
                        </section>
                    </section>
                </section>
                <section className="information-section">
                    <section className="left-sections">
                        <article className="confirm-email-section">
                            <div className="section-titles">Confirm email address</div>
                            <input className="booking-information-input"/>
                        </article>
                        <article className="confirm-number-section">
                            <div className="section-titles">Confirm phone number</div>
                            <input className="booking-information-input"/>
                        </article>
                    </section>
                    <article className="special-requests-sections">
                        <div className="section-titles">Special custom requests</div>
                        <textarea className="booking-information-input" />
                    </article>
                </section>
                <section className="booking-confirmation-section">
                    <section className="accept-conditions-section">
                        <article className="accept-conditions">
                            <input type="checkbox" id="accept-conditions" name="accept-conditions" />
                            I have read and accept the <a>house rules of the host</a>
                        </article>
                        <article className="accept-conditions">
                            <input type="checkbox" id="accept-privacy-policy" name="accept-privacy-policy" />
                            I have read and accept the <a>privacy agreement</a>
                        </article>
                        <article className="accept-conditions">
                            <input type="checkbox" id="accept-cookies-policy" name="accept-cookies-policy" />
                            I have read and accept the <a>terms and conditions</a>
                        </article>
                    </section>
                    <article className="cost-overview-section">
                        <button>Cost Overview</button>
                    </article>
                </section>
            </section>
        </main>
    );
}

export default BookingOverview;
