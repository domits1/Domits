import React from 'react';
import { useNavigate } from 'react-router-dom';
import faceHappyIcon from '../../images/icons/face-happy.png';
import messageIcon from '../../images/icons/message-chat-circle.png';
import paymentIcon from '../../images/icons/credit-card-check.png';
import settingsIcon from '../../images/icons/settings-04.png';
import starIcon from '../../images/icons/star-01.png';
import changeScreenIcon from '../../images/icons/Icon.png';
import './paymentsguestdashboard.css';
import villaImage from '../../images/accommodationtestpic1.png'; // Assuming this is the villa image

const PaymentsGuestDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="guestdashboard">

            <div className="sidebar">
                <div className="button" onClick={() => navigate("/guestdashboard")}>
                    <img src={faceHappyIcon} alt="Happy face Icon" className="icon" />
                    Profile
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/messages")}>
                    <img src={messageIcon} alt="Message Icon" className="icon" />
                    Message
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/payments")}>
                    <img src={paymentIcon} alt="Credit Card Icon" className="icon" />
                    Payments
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/reviews")}>
                    <img src={starIcon} alt="Star Icon" className="icon" />
                    Reviews
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/settings")}>
                    <img src={settingsIcon} alt="Settings Icon" className="icon" />
                    Settings
                </div>
                <div className="button last-button" onClick={() => { /* Implement navigation logic for Change Start screen when available */ }}>
                    <img src={changeScreenIcon} alt="Change Screen Icon" className="icon" />
                    Change Start screen
                </div>            </div>
            <div className="content">
                <div className="payments-content">
                    <div className="fulfilled-payments">
                        <h2>Fulfilled payments</h2>
                        <div className="payment-item">
                            <h3>Tropical 12 person villa with pool</h3>
                            <img
                                src={villaImage}
                                alt="Villa"
                                style={{ width: '100px', height: 'auto' }}
                            />
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
    );
}

export default PaymentsGuestDashboard;
