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
  const [occupancyData] = useState({
    occupancyRate: 0,
    numberOfProperties: 0,
    vsLastMonth: 0,
  });

  const [bookedNights, setBookedNights] = useState(0);
  const [availableNights, setAvailableNights] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);

  const [loadingStates, setLoadingStates] = useState({
    user: true,
    revenue: false,
    occupancy: false,
    bookedNights: false,
    availableNights: false,
    monthlyRevenue: false,
  });

  const updateLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  // 🔑 Generic Fetcher
  const fetchMetricData = async (metric, setStateCallback, loadingKey) => {
    if (!cognitoUserId) return console.error("Cognito User ID is missing.");
    updateLoadingState(loadingKey, true);

    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();

      const response = await fetch(
        `${BASE_URL}?hostId=${cognitoUserId}&metric=${metric}`,
        {
          method: "GET",
          headers: { Authorization: token },
        }
      );

      let data = await response.json();
      if (data.body) data = JSON.parse(data.body);

      setStateCallback(data);
    } catch (error) {
      console.error(`Error fetching ${metric}:`, error);
    } finally {
      updateLoadingState(loadingKey, false);
    }
  };

  // ---- Metric Fetchers ----
  const fetchRevenueData = () =>
    fetchMetricData(
      "revenue",
      (data) => setTotalRevenue(data.revenue?.totalRevenue || 0),
      "revenue"
    );

  const fetchBookedNights = () =>
    fetchMetricData(
      "bookedNights",
      (data) => {
        let nights = 0;
        if (data.bookedNights) {
          if (typeof data.bookedNights === "number") nights = data.bookedNights;
          else if ("value" in data.bookedNights) nights = data.bookedNights.value;
          else if ("bookedNights" in data.bookedNights) nights = data.bookedNights.bookedNights;
        }
        setBookedNights(nights);
      },
      "bookedNights"
    );

  const fetchAvailableNights = () =>
    fetchMetricData(
      "availableNights",
      (data) => {
        let nights = 0;
        if (data.availableNights) {
          if (typeof data.availableNights === "number") nights = data.availableNights;
          else if ("value" in data.availableNights) nights = data.availableNights.value;
          else if ("availableNights" in data.availableNights) nights = data.availableNights.availableNights;
        }
        setAvailableNights(nights);
      },
      "availableNights"
    );

  const fetchPropertyCount = () =>
    fetchMetricData(
      "propertyCount",
      (data) => {
        let count = 0;
        if (data.propertyCount) {
          if (typeof data.propertyCount === "number") count = data.propertyCount;
          else if ("value" in data.propertyCount) count = data.propertyCount.value;
        }
        setPropertyCount(count);
      },
      "propertyCount"
    );

  const fetchMonthlyRevenueData = () =>
    fetchMetricData(
      "monthlyComparison",
      (data) => setMonthlyRevenueData(data.monthlyComparison || []),
      "monthlyRevenue"
    );

  // ---- User + Stripe Setup ----
  useEffect(() => {
    const fetchUserInfo = async () => {
      updateLoadingState("user", true);
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub)
          throw new Error("Invalid Cognito User Info");

        setCognitoUserId(userInfo.attributes.sub);

        const response = await axios.post(
          "https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists",
          { sub: userInfo.attributes.sub },
          { headers: { "Content-Type": "application/json" } }
        );

        const parsedBody = JSON.parse(response.data.body);
        if (parsedBody.hasStripeAccount) {
          setStripeLoginUrl(parsedBody.loginLinkUrl);
          setStripeStatus(parsedBody.bankDetailsProvided ? "complete" : "incomplete");
        } else {
          setStripeStatus("none");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      } finally {
        updateLoadingState("user", false);
      }
    };

    fetchUserInfo();
  }, []);

  // ---- Load Metrics When Cognito User Ready ----
  useEffect(() => {
    if (cognitoUserId) {
      fetchRevenueData();
      fetchBookedNights();
      fetchAvailableNights();
      fetchMonthlyRevenueData();
      fetchPropertyCount();
    }
  }, [cognitoUserId]);

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
              {stripeStatus === "none" && (
                <div>
                  <h3>No Stripe Account Found</h3>
                  <button onClick={() => window.open(stripeLoginUrl, "_blank")}>
                    Connect Stripe
                  </button>
                </div>
              )}
              {stripeStatus === "complete" && (
                <>
                  <div className="hr-revenue-overview">
                    <h3>Revenue Overview</h3>
                    <RevenueOverview
                      title="Total Revenue"
                      value={`$${totalRevenue || 0}`}
                    />
                    <RevenueOverview
                      title="Booked Nights"
                      value={bookedNights}
                    />
                    <RevenueOverview
                      title="Available Nights"
                      value={availableNights}
                    />
                    <RevenueOverview
                      title="Total Properties"
                      value={propertyCount}
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
                    <BookedNights nights={bookedNights} />
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
