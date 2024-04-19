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
        <main className="booking-container">
            <article className="back-arrow">
                <a href="/bookingoverview">
                    <img src={backarrow} alt="Back Arrow"/>
                </a>
            </article>
            <section className="image-section">
                <img src={bookingimage1} alt="Booking Image 1" className="booking-image1"/>
                <div className="imageWindow">
                    <img src={bookingimage2} alt="Booking Image 2"/>
                    <img src={bookingimage3} alt="Booking Image 3"/>
                    <img src={bookingimage4} alt="Booking Image 4" className="booking-image4"/>
                    <img src={bookingimage5} alt="Booking Image 5" className="booking-image5"/>
                </div>
            </section>
            <section className="info-section">
                <section className="title-section">
                    <div className="section-titles">Payment in process</div>
                    <div className="booking-subtitle">Choose your payment method and pay safely through Stripe
                    </div>
                </section>
                <section className="booking-overview-section">
                    <div className="section-titles">Price Details</div>
                    {/* div in text kan niet moet aangepast worden */}
                    <div className="small-information-text">2 adults - 2 kids | 3 night</div>
                    <section className="details-row">
                        <section className="left-column">
                            <article className="row">
                                <span className="detail">$140 night x 3</span>
                            </article>
                            <article className="row">
                                <span className="detail">Cleaning fee</span>
                            </article>
                            <article className="row">
                                <span className="detail">Cat tax</span>
                            </article>
                            <article className="domits-service-fee">
                                <span className="detail">Domits service fee:</span>
                            </article>
                        </section>
                        <section className="right-column">
                            <section className="row">
                                <span>$420,00</span>
                            </section>
                            <section className="row">
                                <span>$50,00</span>
                            </section>
                            <section className="row">
                                <span>$17,50</span>
                            </section>
                            <article className="domits-service-fee">
                                <span>$39,50</span>
                            </article>
                        </section>
                    </section>
                    <hr/>
                    <section className="total-row">
                        <section className="row">
                            <span className="total-detail total-booking-price">Total (DOL)</span>
                        </section>
                        <section className="row">
                            <span className="total-detail">$527,00</span>
                        </section>
                    </section>
                </section>
                <section className="payment-method-container">
                    <div className="payment-method-header">
                        Payment Method
                    </div>

                    {/* div met text moet aangepast worden */}
                    <section className="payment-method-section">
                        <article className="payment-information-section">
                            <div className="payment-type-text">Mastercard</div>
                    {/* div met text moet aangepast worden */}

                            <div className="payment-info-text">[ L.Summer ] [0123 xxxx xxxx 2345]</div>
                        </article>
                        <button className="change-payment-button">Change</button>
                    </section>
                </section>
                <section className="confirm-booking-payment-section">
                    <article className="accept-personal-data-terms">
                        <input type="checkbox" />
                        I have read and accept the <a>personal data terms </a> on how we collect and proccess your data
                    </article>
                    <article className="proceed-to-pay-button">
                        <button>Proceed to pay*</button>
                    </article>
                    <article className="proceed-to-pay-text">
                        *Secure payment gateway powered by Stripe.com
                    </article>
                </section>
            </section>
        </main>
    );
}

export default BookingPayment;
