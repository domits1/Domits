import React, { useState, useEffect } from "react";
import "./HostRevenueStyle.scss";
import RevenueOverview from "./HostRevenueCards/RevenueOverview.jsx";
import MonthlyComparison from "./HostRevenueCards/MonthlyComparison.jsx";
import OccupancyRateCard from "./HostRevenueCards/OccupancyRate.jsx";
import RevPARCard from "./HostRevenueCards/RevPAR.jsx";
import ADRCard from "./HostRevenueCards/ADRCard.jsx";
import BookedNights from "./HostRevenueCards/BookedNights.jsx";
import ALOSCard from "./HostRevenueCards/ALOSCard.jsx"; 
import { Auth } from "aws-amplify";
import ClipLoader from "react-spinners/ClipLoader";
import { HostRevenueService } from "../hostdashboard/services/HostRevenueService.js";

const HostRevenues = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
  const [bookedNights, setBookedNights] = useState(0);
  const [availableNights, setAvailableNights] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);

  const [loadingStates, setLoadingStates] = useState({
    user: true,
    revenue: false,
  });

  const updateLoadingState = (key, value) =>
    setLoadingStates((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const fetchUserInfo = async () => {
      updateLoadingState("user", true);
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub)
          throw new Error("Invalid Cognito User Info");
        setCognitoUserId(userInfo.attributes.sub);
      } catch (error) {
        console.error("Error fetching user info:", error);
      } finally {
        updateLoadingState("user", false);
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (!cognitoUserId) return;

    const fetchAllData = async () => {
      try {
        updateLoadingState("revenue", true);
        const [revenue, nights, available, properties, monthly] =
          await Promise.all([
            HostRevenueService.getRevenue(cognitoUserId),
            HostRevenueService.getBookedNights(cognitoUserId),
            HostRevenueService.getAvailableNights(cognitoUserId),
            HostRevenueService.getPropertyCount(cognitoUserId),
            HostRevenueService.getMonthlyComparison(cognitoUserId),
          ]);

        setTotalRevenue(revenue);
        setBookedNights(nights);
        setAvailableNights(available);
        setPropertyCount(properties);
        setMonthlyRevenueData(monthly);
      } catch (error) {
        console.error("Error fetching revenue data:", error);
      } finally {
        updateLoadingState("revenue", false);
      }
    };

    fetchAllData();
  }, [cognitoUserId]);

  const occupancyRate =
    availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;

  return (
    <main className="hr-page-body hr-container">
      <h2>Revenues</h2>
      <section className="hr-host-revenues">
        <div className="hr-content">
          {loadingStates.user ? (
            <div className="hr-revenue-spinner-container">
              <ClipLoader size={100} color="#3498db" loading={true} />
            </div>
          ) : (
            <>
              <div className="hr-revenue-overview">
                <RevenueOverview
                  title="Total Revenue"
                  value={`$${totalRevenue.toLocaleString()}`}
                />
                <RevenueOverview title="Booked Nights" value={bookedNights} />
                <RevenueOverview title="Available Nights" value={availableNights} />
                <RevenueOverview title="Total Properties" value={propertyCount} />
              </div>

              <div className="hr-monthly-comparison">
                <h3>Monthly Comparison</h3>
                <MonthlyComparison data={monthlyRevenueData} />
              </div>

              <div className="hr-cards">
                <OccupancyRateCard
                  occupancyRate={occupancyRate.toFixed(2)}
                  numberOfProperties={propertyCount}
                />
                <ADRCard hostId={cognitoUserId} />
                <RevPARCard />
                <BookedNights nights={bookedNights} />
                <ALOSCard />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default HostRevenues;
