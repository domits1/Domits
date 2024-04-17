import React from 'react';
import { useNavigate } from 'react-router-dom';

import './guestdashboard.css';
import Pages from "./Pages.js";
import './paymentsguestdashboard.css';

const PaymentsGuestDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="guestdashboard">
            <div className='dashboards'>
                <Pages />
                <div className="content">
                    <div className="payments-content">
                        <div className="fulfilled-payments">
                            <h2>Fulfilled payments</h2>
                            <div className="payment-item">
                                <h3>Tropical 12 person villa with pool</h3>
                                <p>Total: $3460,49-</p>
                                <button className="add-payment-button">+</button>
                            </div>
                            {/* Additional fulfilled payments here */}
                        </div>
                        <div className="payment-methods">
                            <h2>Payment methods</h2>
                            <div className="payment-method-box">
                                <div className="payment-method-title">Mastercard</div>
                                <div className="payment-method-details">
                                    <p>L.Summer</p>
                                    <p>[0123 xxxx xxxx 2345]</p>
                                    <p>[10/27]</p>
                                    {/* Icon for editing or removing */}
                                </div>
                            </div>
                            <div className="payment-method-box">
                                <div className="payment-method-title">Klarna Afterpay</div>
                                <div className="payment-method-details">
                                    <p>Active since November 2023</p>
                                    {/* Icon for editing or removing */}
                                </div>
                            </div>
                            <div className="payment-method-box">
                                <div className="payment-method-title">Domits coins</div>
                                <div className="payment-method-details">
                                    <p>1 coin = 1 EUR</p>
                                    <p>700 coins</p>
                                    {/* Icon for adding coins */}
                                </div>
                            </div>
                            <button className="add-payment-method">Add payment method</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PaymentsGuestDashboard;
