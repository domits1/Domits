import backarrow from "../../images/arrowleft.png";
import checkcirlce from "../../images/check-circle.svg";
import bookingimage1 from "../../images/accobigimg.png";
import bookingimage2 from "../../images/adultacco.png";
import bookingimage3 from "../../images/accoimg4.png";
import bookingimage4 from "../../images/accoimg3.png";
import bookingimage5 from "../../images/accoimg1.png";
import React from 'react';
import './BookingConfirmedDeclined.css';

const BookingConfirmed = () => {
    return (
        <div className="booking-container">
            <div className="image-section booking-confirmed-image-section">
                <img src={bookingimage1} alt="Booking Image 1" className="booking-image1"/>
                <div className="imageWindow">
                    <img src={bookingimage2} alt="Booking Image 2"/>
                    <img src={bookingimage3} alt="Booking Image 3"/>
                    <img src={bookingimage4} alt="Booking Image 4" className="booking-image4"/>
                    <img src={bookingimage5} alt="Booking Image 5" className="booking-image5"/>
                </div>
            </div>
            <div className="info-section">
                <div className="booking-supertitle">
                    Minimalistic and cozy place in Haarlem
                </div>
                <div className="booking-confirmed-section">
                    <div className="booking-confirmed-content">
                        <div className="booking-confirmed-title">Booking Confirmed!</div>
                        <div className="booking-confirmed-subtitle">You paid with Mastercard [ L.Summer ] [0123 xxxx xxxx 2345]</div>
                    </div>
                    <div className="booking-confirmed-check">
                        <img src={checkcirlce} alt="Checkmark"/>
                    </div>
                </div>
                <div className="booking-confirmation-details">
                    Payment and booking details are send to lotte_summer@gmail.com
                    <a>Resend confirmation</a>
                </div>
                <div className="booking-overview-section">
                    <div className="section-titles">Price Details</div>
                    <div className="small-information-text">2 adults - 2 kids | 3 night</div>
                    <div className="details-row">
                        <div className="left-column">
                            <div className="row">
                                <span className="detail">$140 night x 3</span>
                            </div>
                            <div className="row">
                                <span className="detail">Cleaning fee</span>
                            </div>
                            <div className="row">
                                <span className="detail">Cat tax</span>
                            </div>
                            <div className="domits-service-fee">
                                <span className="detail">Domits service fee:</span>
                            </div>
                        </div>
                        <div className="right-column">
                            <div className="row">
                                <span>$420,00</span>
                            </div>
                            <div className="row">
                                <span>$50,00</span>
                            </div>
                            <div className="row">
                                <span>$17,50</span>
                            </div>
                            <div className="domits-service-fee">
                                <span>$39,50</span>
                            </div>
                        </div>
                    </div>
                    <hr/>
                    <div className="total-row">
                        <div className="row">
                            <span className="total-detail total-booking-price">Total (DOL)</span>
                        </div>
                        <div className="row">
                            <span className="total-detail">$527,00</span>
                        </div>
                    </div>
                </div>
                <div className="payment-method-container">
                    <div className="payment-method-header">
                        Payment Method
                    </div>
                    <div className="payment-method-section">
                        <div className="payment-information-section">
                            <div className="payment-type-text">Mastercard</div>
                            <div className="payment-info-text">[ L.Summer ] [0123 xxxx xxxx 2345]</div>
                        </div>
                    </div>
                </div>
                <div className="view-booking-section">
                    <div className="view-booking-button">
                        <button>View booking</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookingConfirmed;
