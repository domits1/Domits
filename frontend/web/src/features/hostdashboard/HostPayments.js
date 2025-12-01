import React, { useState, useEffect, useRef } from "react";
import { Auth } from "aws-amplify";
import { HostRevenueService } from "../hostdashboard/services/HostRevenueService.js";
import ClipLoader from "react-spinners/ClipLoader";
import RevenueOverview from "./HostRevenueCards/RevenueOverview.jsx";
import MonthlyComparison from "./HostRevenueCards/MonthlyComparison.jsx";
import OccupancyRateCard from "./HostRevenueCards/OccupancyRate.jsx";
import RevPARCard from "./HostRevenueCards/RevPAR.jsx";
import ADRCard from "./HostRevenueCards/ADRCard.jsx";
import BookedNights from "./HostRevenueCards/BookedNights.jsx";
import ALOSCard from "./HostRevenueCards/ALOSCard.jsx";
import "./HostRevenueStyle.scss";

const HostRevenues = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
  const [bookedNights, setBookedNights] = useState(0);
  const [availableNights, setAvailableNights] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setCognitoUserId(user.attributes.sub);
      } catch (err) {
        console.error("Auth error:", err);
        setError("Authentication failed");
      }
    })();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function fetchAllData() {
    if (!cognitoUserId) return;
    setLoading(true);
    setError(null);

    try {
     
      await Auth.currentSession();

      const [revenue, nights, available, properties, monthly] =
        await Promise.all([
          HostRevenueService.getRevenue(cognitoUserId),
          HostRevenueService.getBookedNights(cognitoUserId),
          HostRevenueService.getAvailableNights(cognitoUserId),
          HostRevenueService.getPropertyCount(cognitoUserId),
          HostRevenueService.getMonthlyComparison(cognitoUserId),
        ]);

      if (!isMountedRef.current) return;

      setTotalRevenue(revenue);
      setBookedNights(nights);
      setAvailableNights(available);
      setPropertyCount(properties);
      setMonthlyRevenueData(monthly);
    } catch (err) {
      console.error("Error fetching revenue data:", err);
      if (isMountedRef.current) setError("Failed to fetch revenue data");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
  if (!cognitoUserId || monthlyRevenueData.length > 0) return;
  fetchAllData();
}, [cognitoUserId]);

  const occupancyRate =
    availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;

  if (loading) {
    return (
      <div className="hr-revenue-spinner-container">
        <ClipLoader size={100} color="#3498db" />
      </div>
    );
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  return (
    <main className="hr-page-body hr-container">
      <h2>Yearly Report</h2>
      <section className="hr-host-revenues">
        <div className="hr-content">
          <div className="hr-revenue-overview">
            <RevenueOverview title="Total Revenue" value={`€${totalRevenue.toLocaleString()}`} />
            <RevenueOverview title="Booked Nights" value={bookedNights} />
            <RevenueOverview title="Available Nights" value={availableNights} />
            <RevenueOverview title="Total Properties" value={propertyCount} />
          </div>

          <div className="hr-monthly-comparison">
            <h3>Monthly Comparison</h3>
            <MonthlyComparison data={monthlyRevenueData} />
          </div>

          <div className="hr-cards">
            <OccupancyRateCard occupancyRate={occupancyRate.toFixed(2)} numberOfProperties={propertyCount} />
            <ADRCard hostId={cognitoUserId} />
            <RevPARCard />
            <BookedNights nights={bookedNights} />
            <ALOSCard />
          </div>
        </div>
      </section>
    </main>
  );
};

export default HostRevenues;
