import React, { useState, useEffect } from 'react';
import Pages from "./Pages.js";
import './HostRevenueStyle.css';
import { gql, useQuery } from '@apollo/client';
import RevenueOverview from './HostRevenueCards/RevenueOverview.jsx';
import axios from "axios";
import MonthlyComparison from './HostRevenueCards/MonthlyComparison.jsx';
import OccupancyRateCard from './HostRevenueCards/OccupancyRate.jsx';
import RevPARCard from './HostRevenueCards/RevPAR.jsx';
import ADRCard from './HostRevenueCards/ADRCard.jsx';
import { Auth } from 'aws-amplify';
import ClipLoader from 'react-spinners/ClipLoader';
import BookingTrends from './HostRevenueCards/BookingTrends.jsx';
import BookedNights from './HostRevenueCards/BookedNights.jsx';

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
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [stripeStatus, setStripeStatus] = useState('');
    const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
    const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
    const [occupancyData, setOccupancyData] = useState({
        occupancyRate: 0,
        numberOfProperties: 0,
        vsLastMonth: 0,
    });
    const [bookedNights, setBookedNights] = useState(null);
    const [loadingStates, setLoadingStates] = useState({
        user: true,
        occupancy: false,
        bookedNights: false,
        monthlyRevenue: false,
    });

    const { loading: revenueLoading, data } = useQuery(GET_REVENUE);

    // Update specific loading state
    const updateLoadingState = (key, value) => {
        setLoadingStates((prev) => ({ ...prev, [key]: value }));
    };

    // Fetch user and Stripe status
    useEffect(() => {
        const fetchUserInfo = async () => {
            updateLoadingState('user', true);
            try {
                const userInfo = await Auth.currentUserInfo();
                if (!userInfo?.attributes?.sub) throw new Error("Invalid Cognito User Info");

                setCognitoUserId(userInfo.attributes.sub);

                const response = await axios.post(
                    'https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists',
                    { sub: userInfo.attributes.sub },
                    { headers: { 'Content-Type': 'application/json' } }
                );

                const parsedBody = JSON.parse(response.data.body);
                if (parsedBody.hasStripeAccount) {
                    setStripeLoginUrl(parsedBody.loginLinkUrl);
                    setStripeStatus(parsedBody.bankDetailsProvided ? 'complete' : 'incomplete');
                } else {
                    setStripeStatus('none');
                }
            } catch (error) {
                console.error("Error fetching user info:", error);
            } finally {
                updateLoadingState('user', false);
            }
        };

        fetchUserInfo();
    }, []);

    // Fetch Occupancy Data
    const fetchOccupancyData = async () => {
        if (!cognitoUserId) return console.error("Cognito User ID is missing.");

        updateLoadingState('occupancy', true);
        try {
            const response = await axios.post(
                'https://cui7ru7r87.execute-api.eu-north-1.amazonaws.com/prod/occupancy',
                { hostId: cognitoUserId },
                { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } }
            );

            if (response.data?.data && Array.isArray(response.data.data)) {
                const occupancy = response.data.data[0] || {};
                setOccupancyData({
                    occupancyRate: occupancy.combinedOccupancyRate
                        ? occupancy.combinedOccupancyRate / 100
                        : 0,
                    numberOfProperties: occupancy.totalProperties || 0,
                    vsLastMonth: response.data.vsLastMonth || 0,
                });
            } else {
                throw new Error("Invalid API response structure.");
            }
        } catch (error) {
            console.error("Error fetching occupancy data:", error);
        } finally {
            updateLoadingState('occupancy', false);
        }
    };

    // Fetch Booked Nights
    const fetchBookedNights = async () => {
        if (!cognitoUserId) return console.error("Cognito User ID is missing.");

        updateLoadingState('bookedNights', true);
        try {
            const response = await axios.post(
                'https://yjzk78t2u0.execute-api.eu-north-1.amazonaws.com/prod/Host-Revenues-Production-Read-BookedNights',
                { hostId: cognitoUserId, periodType: "monthly" },
                { headers: { 'Content-Type': 'application/json' } }
            );
            setBookedNights(response.data.bookedNights || 0);
        } catch (error) {
            console.error("Error fetching booked nights:", error);
        } finally {
            updateLoadingState('bookedNights', false);
        }
    };

    // Fetch Monthly Revenue Data
    const fetchMonthlyRevenueData = async () => {
        if (!cognitoUserId) return console.error("Cognito User ID is missing.");

        updateLoadingState('monthlyRevenue', true);
        try {
            const response = await axios.post(
                'https://dcp1zwsq7c.execute-api.eu-north-1.amazonaws.com/default/GetMonthlyComparison',
                { hostId: cognitoUserId },
                { headers: { 'Content-Type': 'application/json' } }
            );
            setMonthlyRevenueData(response.data);
        } catch (error) {
            console.error("Error fetching monthly revenue data:", error);
        } finally {
            updateLoadingState('monthlyRevenue', false);
        }
    };

    // Trigger data fetching when cognitoUserId is available
    useEffect(() => {
        if (cognitoUserId) {
            fetchOccupancyData();
            fetchBookedNights();
            fetchMonthlyRevenueData();
        }
    }, [cognitoUserId]);

    return (
        <main className="hr-page-body hr-container">
            <section className="hr-host-revenues">
                <div className="hr-pages">
                    <Pages />
                </div>
                <div className="hr-content">
                    {loadingStates.user || revenueLoading ? (
                        <div className="hr-revenue-spinner-container">
                            <ClipLoader size={100} color="#3498db" loading={true} />
                        </div>
                    ) : (
                        <>
                            {stripeStatus === 'none' && (
                                <div>
                                    <h3>No Stripe Account Found</h3>
                                    <button onClick={() => window.open(stripeLoginUrl, '_blank')}>
                                        Connect Stripe
                                    </button>
                                </div>
                            )}
                            {stripeStatus === 'complete' && (
                                <>
                                    <div className="hr-revenue-overview">
                                        <h3>Revenue Overview</h3>
                                        <RevenueOverview
                                            title="Total Revenue This Month"
                                            value={`$${data?.getRevenue?.totalRevenueThisMonth || 0}`}
                                        />
                                        <RevenueOverview
                                            title="Year-To-Date Revenue"
                                            value={`$${data?.getRevenue?.yearToDateRevenue || 0}`}
                                        />
                                        <RevenueOverview
                                            title="Total Revenue"
                                            value={`$${data?.getRevenue?.totalRevenue || 0}`}
                                        />
                                    </div>
                                    <div className="hr-monthly-comparison">
                                        <h3>Monthly Comparison</h3>
                                        <MonthlyComparison data={monthlyRevenueData} />
                                    </div>
                                    <div className="hr-cards">
                                        <OccupancyRateCard {...occupancyData} />
                                        <ADRCard hostId={cognitoUserId} />
                                        <RevPARCard />
                                        <BookedNights/>
                                        <BookingTrends />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;