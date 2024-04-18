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
        <main className="booking-container">
            <article className="image-section booking-confirmed-image-section">
                <img src={bookingimage1} alt="Booking Image 1" className="booking-image1"/>
                <article className="imageWindow">
                    <img src={bookingimage2} alt="Booking Image 2"/>
                    <img src={bookingimage3} alt="Booking Image 3"/>
                    <img src={bookingimage4} alt="Booking Image 4" className="booking-image4"/>
                    <img src={bookingimage5} alt="Booking Image 5" className="booking-image5"/>
                </article>
            </article>
            <section className="info-section">
                <div className="booking-supertitle">
                    {/* divs met text moet aangepast worden */}

                    Minimalistic and cozy place in Haarlem
                </div>
                <article className="booking-confirmed-section">
                    <section className="booking-confirmed-content">
                        <div className="booking-confirmed-title">Booking Confirmed!</div>
                    {/* divs met text moet aangepast worden */}
                        <div className="booking-confirmed-subtitle">You paid with Mastercard [ L.Summer ] [0123 xxxx xxxx 2345]</div>
                    </section>
                    <aritcle className="booking-confirmed-check">
                        <img src={checkcirlce} alt="Checkmark"/>
                    </aritcle>
                </article>
                <div className="booking-confirmation-details">
                    Payment and booking details are send to lotte_summer@gmail.com
                    {/* divs met text moet aangepast worden */}
                    <a>Resend confirmation</a>
                </div>
                <section className="booking-overview-section">
                    <div className="section-titles">Price Details</div>
                    {/* divs met text moet aangepast worden */}
                    <div className="small-information-text">2 adults - 2 kids | 3 night</div>

                    <section className="details-row">
                        <article className="left-column">
                            <section className="row">
                                <span className="detail">$140 night x 3</span>
                            </section>
                            <section className="row">
                                <span className="detail">Cleaning fee</span>
                            </section>
                            <section className="row">
                                <span className="detail">Cat tax</span>
                            </section>
                            <section className="domits-service-fee">
                                <span className="detail">Domits service fee:</span>
                            </section>
                        </article>
                        <article className="right-column">
                            <section className="row">
                                <span>$420,00</span>
                            </section>
                            <section className="row">
                                <span>$50,00</span>
                            </section>
                            <section className="row">
                                <span>$17,50</span>
                            </section>
                            <section className="domits-service-fee">
                                <span>$39,50</span>
                            </section>
                        </article>
                    </section>
                    <hr/>
                    <article className="total-row">
                        <section className="row">
                            <span className="total-detail total-booking-price">Total (DOL)</span>
                        </section>
                        <section className="row">
                            <span className="total-detail">$527,00</span>
                        </section>
                    </article>
                </section>
                <article className="payment-method-container">
                    <div className="payment-method-header">
                        Payment Method
                        {/* text met div moet aangepast worden */}
                    </div>
                    <aritcle className="payment-method-section">
                        <section className="payment-information-section">
                            <div className="payment-type-text">Mastercard</div>
                        {/* text met div moet aangepast worden */}
                            <div className="payment-info-text">[ L.Summer ] [0123 xxxx xxxx 2345]</div>
                        </section>
                    </aritcle>
                </article>
                <article className="view-booking-section">
                    <div className="view-booking-button">
                        <button>View booking</button>
                    </div>
                </article>
            </section>
        </main>
    );
}

export default BookingConfirmed;
