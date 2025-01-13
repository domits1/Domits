import React, { useState, useEffect } from 'react';
import Pages from "./Pages.js";
import './HostRevenueStyle.css';
import { gql, useQuery } from '@apollo/client';
import RevenueOverview from './HostRevenueCards/RevenueOverview.jsx';
import axios from "axios";
import MonthlyComparison from './HostRevenueCards/MonthlyComparison.jsx';
import OccupancyRateCard from './HostRevenueCards/OccupancyRate.jsx';
import RevPARCard from './HostRevenueCards/RevPAR.jsx'; // Import RevPARCard
import ADRCard from './HostRevenueCards/ADRCard.jsx';
import { Auth } from 'aws-amplify';

const GET_REVENUE = gql`
    query GetRevenue {
        getRevenue {
            totalRevenue
            totalRevenueThisMonth
            yearToDateRevenue
        }
    }
`;

const HostRevenues = () => {
    const [userEmail, setUserEmail] = useState(null);
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
    const [bankDetailsProvided, setBankDetailsProvided] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stripeStatus, setStripeStatus] = useState('');
    const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
    const [occupancyData, setOccupancyData] = useState(null);

    const { loading: revenueLoading, error, data } = useQuery(GET_REVENUE);

    const fetchMonthlyRevenueData = async () => {
        try {
            const response = await axios.post('https://dcp1zwsq7c.execute-api.eu-north-1.amazonaws.com/default/GetMonthlyComparison');
            setMonthlyRevenueData(response.data);
        } catch (error) {
            console.error("Error fetching monthly comparison data:", error);
        }
    };

    const fetchOccupancyData = async () => {
        try {
            const response = await axios.get('https://cui7ru7r87.execute-api.eu-north-1.amazonaws.com/prod/occupancy');
            setOccupancyData(response.data);
        } catch (error) {
            console.error("Error fetching occupancy data:", error);
        }
    };

    useEffect(() => {
        fetchMonthlyRevenueData();
        fetchOccupancyData();
    }, []);

    useEffect(() => {
        const fetchUserAndStripeStatus = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserEmail(userInfo.attributes.email);
                setCognitoUserId(userInfo.attributes.sub);

                const response = await fetch(`https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists`, {
                    method: 'POST',
                    headers: { 'Content-type': 'application/json; charset=UTF-8' },
                    body: JSON.stringify({ sub: userInfo.attributes.sub }),
                });

                const data = await response.json();
                const parsedBody = JSON.parse(data.body);

                if (parsedBody.hasStripeAccount) {
                    setStripeLoginUrl(parsedBody.loginLinkUrl);
                    setBankDetailsProvided(parsedBody.bankDetailsProvided);
                    setStripeStatus(parsedBody.bankDetailsProvided ? 'complete' : 'incomplete');
                } else {
                    setStripeStatus('none');
                }
            } catch (error) {
                console.error("Error fetching user or Stripe status:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndStripeStatus();
    }, []);

    const handleStripeAction = () => {
        if (stripeLoginUrl) {
            window.open(stripeLoginUrl, '_blank');
        } else if (userEmail && cognitoUserId) {
            const createStripeAccount = async () => {
                const result = await fetch('https://zuak8serw5.execute-api.eu-north-1.amazonaws.com/dev/CreateStripeAccount', {
                    method: 'POST',
                    body: JSON.stringify({ userEmail, cognitoUserId }),
                    headers: { 'Content-type': 'application/json; charset=UTF-8' },
                });
                const data = await result.json();
                window.location.replace(data.url);
            };
            createStripeAccount();
        }
    };

    if (loading || revenueLoading) return <p>Loading...</p>;
    if (error) return <p>Error loading revenue data: {error.message}</p>;

    const revenueData = [
        { title: "Total Revenue This Month", value: `$${data.getRevenue.totalRevenueThisMonth}` },
        { title: "Year-To-Date Revenue", value: `$${data.getRevenue.yearToDateRevenue}` },
        { title: "Total Revenue", value: `$${data.getRevenue.totalRevenue}` }
    ];

    return (
        <main className="hr-page-body hr-container">
            <section className="hr-host-revenues">
                <div className="hr-pages">
                    <Pages />
                </div>
                <div className="hr-content">
                    <h1>Revenue Dashboard</h1>
                    {stripeStatus === 'none' && (
                        <div>
                            <h3>No Stripe Account Found</h3>
                            <p>Connect your Stripe account to start receiving payments.</p>
                            <button onClick={handleStripeAction} className="hr-button">Connect Stripe</button>
                        </div>
                    )}
                    {stripeStatus === 'incomplete' && (
                        <div>
                            <h3>Incomplete Stripe Setup</h3>
                            <p>Your Stripe account is created, but your payment details are missing.</p>
                            <button onClick={handleStripeAction} className="hr-button">Complete Stripe Setup</button>
                        </div>
                    )}
                    {stripeStatus === 'complete' && (
                        <div>
                            <div className="hr-revenue-overview">
                                <h3>Revenue Overview</h3>
                                <div className="hr-card-grid">
                                    {revenueData.map((item, index) => (
                                        <RevenueOverview key={index} title={item.title} value={item.value} />
                                    ))}
                                </div>
                            </div>

                            <div className="hr-monthly-comparison">
                                <MonthlyComparison data={monthlyRevenueData} />
                            </div>

                            {occupancyData ? (
                                <OccupancyRateCard
                                    occupancyRate={occupancyData.combinedOccupancyRate}
                                    numberOfProperties={occupancyData.totalProperties}
                                />
                            ) : (
                                <p>Loading Occupancy Data...</p>
                            )}

                            <div className="hr-card-grid">
                                <ADRCard hostId={cognitoUserId} />  {/* ADR Card */}
                                <RevPARCard />  {/* New RevPAR Card */}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;