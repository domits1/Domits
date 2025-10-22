import React, { useState, useEffect } from "react";
import "./HostRevenueStyle.scss";
import RevenueOverview from "./HostRevenueCards/RevenueOverview.jsx";
import axios from "axios";
import MonthlyComparison from "./HostRevenueCards/MonthlyComparison.jsx";
import OccupancyRateCard from "./HostRevenueCards/OccupancyRate.jsx";
import RevPARCard from "./HostRevenueCards/RevPAR.jsx";
import ADRCard from "./HostRevenueCards/ADRCard.jsx";
import { Auth } from "aws-amplify";
import ClipLoader from "react-spinners/ClipLoader";
import BookedNights from "./HostRevenueCards/BookedNights.jsx";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const HostRevenues = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [stripeStatus, setStripeStatus] = useState("");
  const [stripeLoginUrl, setStripeLoginUrl] = useState(null);

  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
  const [bookedNights, setBookedNights] = useState(0);
  const [availableNights, setAvailableNights] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);

  const [loadingStates, setLoadingStates] = useState({
    user: true,
    revenue: false,
    bookedNights: false,
    availableNights: false,
    propertyCount: false,
    monthlyRevenue: false,
  });

  const updateLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  const fetchMetricData = async (metric, setStateCallback, loadingKey) => {
    if (!cognitoUserId) return;

    updateLoadingState(loadingKey, true);
    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();
      const url = `${BASE_URL}?hostId=${cognitoUserId}&metric=${metric}&filterType=monthly`;

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: token },
      });

      let data = await response.json();
      if (data?.body) data = JSON.parse(data.body);

      console.log(`api (${metric}):`, data);

      switch (metric) {
        case "revenue":
          setStateCallback(Number(data?.revenue?.totalRevenue ?? 0));
          break;
        case "bookedNights":
          setStateCallback(Number(data?.bookedNights?.bookedNights ?? 0));
          break;
        case "availableNights":
          setStateCallback(Number(data?.availableNights?.availableNights ?? 0));
          break;
        case "propertyCount":
          setStateCallback(Number(data?.propertyCount?.propertyCount ?? 0));
          break;
        case "monthlyComparison":
          if (Array.isArray(data)) setStateCallback(data);
          else if (Array.isArray(data?.monthlyComparison)) setStateCallback(data.monthlyComparison);
          else setStateCallback([]); // Show empty chart if no data
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(` ${metric}:`, error);
    } finally {
      updateLoadingState(loadingKey, false);
    }
  };

  const fetchRevenueData = () => fetchMetricData("revenue", setTotalRevenue, "revenue");
  const fetchBookedNightsData = () => fetchMetricData("bookedNights", setBookedNights, "bookedNights");
  const fetchAvailableNightsData = () => fetchMetricData("availableNights", setAvailableNights, "availableNights");
  const fetchPropertyCountData = () => fetchMetricData("propertyCount", setPropertyCount, "propertyCount");
  const fetchMonthlyRevenueData = () => fetchMetricData("monthlyComparison", setMonthlyRevenueData, "monthlyRevenue");

  useEffect(() => {
    const fetchUserInfo = async () => {
      updateLoadingState("user", true);
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub) throw new Error("Invalid Cognito User Info");

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
    if (cognitoUserId) {
      fetchRevenueData();
      fetchBookedNightsData();
      fetchAvailableNightsData();
      fetchPropertyCountData();
      fetchMonthlyRevenueData();
    }
  }, [cognitoUserId]);

  const occupancyRate = availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;

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
                <RevenueOverview title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
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
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default HostRevenues;
