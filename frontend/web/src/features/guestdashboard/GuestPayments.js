import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { LanguageContext } from '../../context/LanguageContext.js';
import en from '../../content/en.json';
import nl from '../../content/nl.json';
import de from '../../content/de.json';
import es from '../../content/es.json';
import Pages from './Pages.js';
import DateFormatterDD_MM_YYYY from '../../utils/DateFormatterDD_MM_YYYY.js';
import spinner from '../../images/spinnner.gif';

const contentByLanguage = { en, nl, de, es };

const PaymentsGuestDashboard = () => {
    const navigate = useNavigate();
    const { language } = useContext(LanguageContext);
    const t = contentByLanguage[language]?.guestdashboard;
    const [payments, setPayments] = useState([]);
    const [cognitoUserId, setCognitoUserId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                const userId = userInfo.attributes.sub;
                setCognitoUserId(userId);

                const response = await fetch(`https://j1ids2iygi.execute-api.eu-north-1.amazonaws.com/default/FetchGuestPayments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId }),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                setPayments(data.payments || []);
            } catch (error) {
                console.error('Error fetching user info or payments:', error);
                setPayments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUserInfo();
    }, []);

    return (
        <div className="page-body">
            <h2>{t?.payments?.title || "Payments"}</h2>
            <div className='dashboards'>
            </div>
            <div className="content">
                {loading ? (
                    <div className="loading-spinner">
                        <img src={spinner} alt="Loading..." />
                    </div>
                ) : (
                    <div className="payments-content">
                        <div className="fulfilled-payments">
                            <h2>{t?.payments?.fulfilled || "Fulfilled payments"}</h2>
                            {payments.map(payment => (
                                <div className="payment-item" key={payment.paymentId}>
                                    <h3>{payment.productName}</h3>
                                    <p>{t?.payments?.paid || "Paid:"} {DateFormatterDD_MM_YYYY(payment.createdAt)}</p>
                                    <h3>{payment.description}</h3>
                                    <p>{t?.payments?.total || "Total:"} &euro;{payment.amount / 100}</p>
                                </div>
                            ))}
                        </div>
                        {/* Payment methods section */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentsGuestDashboard;
