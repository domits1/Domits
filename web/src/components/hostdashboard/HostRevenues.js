import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import './HostRevenueStyle.css';
import Pages from "./Pages.js";
import RevenueOverview from './HostRevenueCards/RevenueOverview.jsx';
import MonthlyComparison from './HostRevenueCards/MonthlyComparison.jsx';
import OccupancyRateCard from './HostRevenueCards/OccupancyRate.jsx';
import RevPARCard from './HostRevenueCards/RevPAR.jsx';
import { gql, useQuery } from '@apollo/client';

// Define the GraphQL query
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
    const [userId, setUserId] = useState(null);

    // Fetch revenue data from AppSync
    const { loading, error, data } = useQuery(GET_REVENUE);

    // Handle user info fetching
    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error finding your user id:", error);
            }
        };
        setUserIdAsync();
    }, []);

    // Handle loading and error states for revenue data
    if (loading) return <p>Loading revenue data...</p>;
    if (error) return <p>Error: {error.message}</p>;

    // Use the fetched revenue data in the revenue overview cards
    const revenueData = [
        { title: "Total Revenue This Month", value: `$${data.getRevenue.totalRevenueThisMonth}` },
        { title: "Year-To-Date Revenue", value: `$${data.getRevenue.yearToDateRevenue}` },
        { title: "Total Revenue", value: `$${data.getRevenue.totalRevenue}` }
    ];

    const chartData = [
        { month: "Jan", thisWeek: 50000, lastWeek: 20000 },
        // other chart data...
    ];

    return (
        <main className="page-body container">
            <section className="host-revenues">
                <div className="pages">
                    <Pages /> {/* Sidebar dashboard */}
                </div>
                <div className="content">
                    <div className="revenue-overview">
                        <h3>Revenue Overview</h3>
                        <div className="card-grid">
                            {revenueData.map((item, index) => (
                                <RevenueOverview key={index} title={item.title} value={item.value} />
                            ))}
                        </div>
                    </div>

                    <div className="cards">
                        <OccupancyRateCard />
                        <RevPARCard />
                    </div>

                    <div className="monthly-comparison">
                        <MonthlyComparison data={chartData} />
                    </div>
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;