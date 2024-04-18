import backarrow from "../../images/arrowleft.png";
import alertcircle from "../../images/alert-circle.svg";
import bookingimage1 from "../../images/accobigimg.png";
import bookingimage2 from "../../images/adultacco.png";
import bookingimage3 from "../../images/accoimg4.png";
import bookingimage4 from "../../images/accoimg3.png";
import bookingimage5 from "../../images/accoimg1.png";
import React from 'react';
import './BookingConfirmedDeclined.css';

const BookingDeclined = () => {
    return (
        <main className="booking-container">
            <article className="image-section booking-confirmedw-image-section">
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
                    Minimalistic and cozy place in Haarlem
                    {/* div met text aanpassen */}
                </div>
                <article className="booking-declined-section">
                    <article className="booking-declined-content">
                        <div className="booking-declined-title">Something went wrong.</div>
                    {/* div met text aanpassen */}

                        <article className="booking-declined-subtitle">
                            <span className="booking-declined-underline">No money was deducted</span>
                            from Mastercard [ L.Summer ] [0123 xxxx xxxx 2345]
                        </article>
                    </article>
                    <article className="booking-declined-alert">
                        <img src={alertcircle} alt="Alert Circle"/>
                    </article>
                </article>
                <section className="booking-overview-section">
                    <div className="section-titles">Price Details</div>
                    {/* div met text aanpassen */}
                    <div className="small-information-text">2 adults - 2 kids | 3 night</div>
                    {/* div met text aanpassen */}
                    <section className="details-row">
                        <article className="left-column">
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
                        </article>
                        <article className="right-column">
                            <article className="row">
                                <span>$420,00</span>
                            </article>
                            <article className="row">
                                <span>$50,00</span>
                            </article>
                            <article className="row">
                                <span>$17,50</span>
                            </article>
                            <article className="domits-service-fee">
                                <span>$39,50</span>
                            </article>
                        </article>
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
                        {/* div met text moet aangepast worden */}
                    </div>
                    <section className="payment-method-section">
                        <article className="payment-information-section">
                            <div className="payment-type-text">Mastercard</div>
                            <div className="payment-info-text">[ L.Summer ] [0123 xxxx xxxx 2345]</div>
                        </article>
                        <button className="change-payment-button">Change</button>
                    </section>
                </section>
                <div className="try-again-section">
                    <div className="try-again-button">
                        <button>Try again</button>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default BookingDeclined;
