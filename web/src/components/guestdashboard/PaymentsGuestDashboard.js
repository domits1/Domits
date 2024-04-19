import React from 'react';
import { useNavigate } from 'react-router-dom';

import './guestdashboard.css';
import Pages from "./Pages.js";
import './paymentsguestdashboard.css';
import villaImage from '../../images/accommodationtestpic1.png'; // Assuming this is the villa image

const PaymentsGuestDashboard = () => {
    const navigate = useNavigate();

    return (
        <main className="guestdashboard">
            <section className='dashboards'>
                <Pages />
                <article className="content">
                    <article className="payments-content">
                        <article className="fulfilled-payments">
                            <h2>Fulfilled payments</h2>
                            <article className="payment-item">
                                <h3>Tropical 12 person villa with pool</h3>
                                <img
                                    src={villaImage}
                                    alt="Villa"
                                    style={{ width: '100px', height: 'auto' }}
                                />
                                <p>Total: $3460,49-</p>
                                <button className="add-payment-button">+</button>
                            </article>
                            {/* Additional fulfilled payments here */}
                        </article>
                        <article className="payment-methods">
                            <h2>Payment methods</h2>
                            <article className="payment-method-box">
                                <div className="payment-method-title">Mastercard</div>
                                {/* div met text moet worden aangepast */}
                                <article className="payment-method-details">
                                    <p>L.Summer</p>
                                    <p>[0123 xxxx xxxx 2345]</p>
                                    <p>[10/27]</p>
                                    {/* Icon for editing or removing */}
                                </article>
                            </article>
                            <article className="payment-method-box">
                                <div className="payment-method-title">Klarna Afterpay</div>
                                {/* div met text moet worden aangepast */}
                                <article className="payment-method-details">
                                    <p>Active since November 2023</p>
                                    {/* Icon for editing or removing */}
                                </article>
                            </article>
                            <article className="payment-method-box">
                                <div className="payment-method-title">Domits coins</div>
                                {/* div met text moet worden aangepast */}
                                <article className="payment-method-details">
                                    <p>1 coin = 1 EUR</p>
                                    <p>700 coins</p>
                                    {/* Icon for adding coins */}
                                </article>
                            </article>
                            <button className="add-payment-method">Add payment method</button>
                        </article>
                    </article>
                </article>
            </section>
        </main>
    );
}

export default PaymentsGuestDashboard;
