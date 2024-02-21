import backarrow from "../../images/arrowleft.png";
import bookingimage1 from "../../images/accobigimg.png";
import bookingimage2 from "../../images/adultacco.png";
import bookingimage3 from "../../images/accoimg4.png";
import bookingimage4 from "../../images/accoimg3.png";
import bookingimage5 from "../../images/accoimg1.png";
import React from 'react';
import './BookingPayment.css';

const BookingPayment = () => {
    return (
        <div className="booking-container">
            <div className="back-arrow">
                <a href="/bookingoverview">
                    <img src={backarrow} alt="Back Arrow"/>
                </a>
            </div>
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
                    <div className="section-titles">Payment in process</div>
                    <div className="booking-subtitle">Choose your payment method and pay safely through Stripe
                    </div>
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
                            <span className="total-detail">Total (DOL)</span>
                        </div>
                        <div className="row">
                            <span className="total-detail">$527,00</span>
                        </div>
                        <br/>
                        <a href="#" className="more-information-link">More information</a>
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
                        <button className="change-payment-button">Change ></button>
                    </div>
                </div>
                <div className="confirm-booking-payment-section">
                    <div className="accept-personal-data-terms">
                        <input type="checkbox" />
                        I have read and accept the <a>personal data terms </a> on how we collect and proccess your data
                    </div>
                    <div className="proceed-to-pay-button">
                        <button>Proceed to pay*</button>
                    </div>
                    <div className="proceed-to-pay-text">
                        *Secure payment gateway powered by Stripe.com
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookingPayment;
