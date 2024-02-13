import {Link} from "react-router-dom";
import backarrow from "../../images/arrowleft.png";
import bookingimage1 from "../../images/accobigimg.png";
import bookingimage2 from "../../images/adultacco.png";
import bookingimage3 from "../../images/accoimg4.png";
import bookingimage4 from "../../images/accoimg3.png";
import bookingimage5 from "../../images/accoimg1.png";
import React from 'react';
import './BookingOverview.css';

const BookingOverview = () => {
    return (
        <div className="booking-container">
            <div className="image-section">
                <img src={bookingimage1} alt="Booking Image 1" className="booking-image1"/>
                <div className="imageWindow">
                    <img src={bookingimage2} alt="Booking Image 2"/>
                    <img src={bookingimage3} alt="Booking Image 3"/>
                    <img src={bookingimage4} alt="Booking Image 4" className="booking-image4"/>
                    <img src={bookingimage5} alt="Booking Image 5" className="booking-image5"/>
                </div>
            </div>
            <div className="info-section">
                <div className="title-section">
                    <div className="section-titles">Minimalistic and cozy place in Haarlem</div>
                    <div className="bookingSubtitle">Fantastic villa with private swimming pool and surrounded by
                        beautiful parks.
                    </div>
                </div>
                <div className="horizontal-sections">
                    <div className="dates-section">
                        <div className="section-titles">Dates</div>
                        <div className="date-guest-wrapper">
                            <div className="small-information-text">05/12/2023 - 08/12/2023</div>
                            <a href="#" className="change-link">Change</a>
                        </div>
                    </div>
                    <div className="guests-section">
                        <div className="section-titles">Guests</div>
                        <div className="date-guest-wrapper">
                            <div className="small-information-text">2 adults - 2 kids</div>
                            <a href="#" className="change-link">Change</a>
                        </div>
                    </div>
                    <div className="extra-cleaning-section">
                        <div className="section-titles">Extra cleaning</div>
                        <div className="date-guest-wrapper">
                            <div className="small-information-text">Select if needed</div>
                            <input className="extraCleaningCheckbox" type="checkbox"/>
                        </div>
                    </div>
                </div>
                <div className="booking-overview-section">
                    <div className="section-titles">Booking overview</div>
                    <div className="small-information-text">05/12/2023 - 08/12/2023</div>
                    <div className="details-row">
                        <div className="left-column">
                            <div className="row">
                                <span className="detail">Main booker:</span>
                            </div>
                            <div className="row">
                                <span className="detail">Amount of guests:</span>
                            </div>
                            <div className="row">
                                <span className="detail">Email address:</span>
                            </div>
                            <div className="row">
                                <span className="detail">Phone number:</span>
                            </div>
                        </div>
                        <div className="right-column">
                            <div className="row">
                                <span>Lotte Summer</span>
                            </div>
                            <div className="row">
                                <span>2 adults - 2 kids</span>
                            </div>
                            <div className="row">
                                <span>lotte_summer@gmail.com</span>
                            </div>
                            <div className="row">
                                <span>+31673282829</span>
                            </div>
                        </div>
                    </div>
                    <hr/>

                    <div className="details-row">
                        <div className="left-column">
                            <div className="row">
                                <span className="accommodation-detail">Accommodation</span>
                            </div>
                        </div>
                        <div className="right-column">
                            <div className="row">
                                <span className="accommodation-detail">Kinderhuissingel 6k</span>
                            </div>
                            <a href="#" className="more-information-link">More information</a>
                        </div>
                    </div>
                </div>
                <div className="booking-overview-section">
                    <div className="section-titles">Booking Overview</div>
                    <div className="small-information-text">05/12/2023 - 08/12/2023</div>
                </div>
            </div>
        </div>
    );
}

export default BookingOverview;
