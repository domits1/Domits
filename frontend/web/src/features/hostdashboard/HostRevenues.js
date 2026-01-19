import React, { useState, useEffect } from "react";
import Pages from "./Pages.js";
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
import { getAccessToken } from "../../services/getAccessToken";


const HostRevenues = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [stripeStatus, setStripeStatus] = useState("");
  const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
  const [monthlyRevenueData, setMonthlyRevenueData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [occupancyData] = useState({
    occupancyRate: 0,
    numberOfProperties: 0,
    vsLastMonth: 0,
  });
  const [setBookedNights] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    user: true,
    revenue: false,
    occupancy: false,
    bookedNights: false,
    monthlyRevenue: false,
  });

  const updateLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  // Fetch Cognito user info and Stripe status
  useEffect(() => {
    const fetchUserInfo = async () => {
      updateLoadingState("user", true);
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub) throw new Error("Invalid Cognito User Info");

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

  
  const fetchRevenueData = async () => {
  if (!cognitoUserId) return console.error("Cognito User ID is missing.");

  updateLoadingState("revenue", true);
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/?hostId=${cognitoUserId}`,
      {
        method: "GET",
        headers: { Authorization: token },
      }
    );

    let data = await response.json();

    if (data.body) {
      data = JSON.parse(data.body);
    }

    setTotalRevenue(data.revenue?.totalRevenue || 0);
    console.log("Revenue data:", data);
  } catch (error) {
    console.error("Error fetching total revenue:", error);
  } finally {
    updateLoadingState("revenue", false);
  }
};

  // Fetch booked nights
  const fetchBookedNights = async () => {
    if (!cognitoUserId) return console.error("Cognito User ID is missing.");

    updateLoadingState("bookedNights", true);
    try {
      const response = await axios.post(
        "https://yjzk78t2u0.execute-api.eu-north-1.amazonaws.com/prod/Host-Revenues-Production-Read-BookedNights",
        { hostId: cognitoUserId, periodType: "monthly" },
        { headers: { "Content-Type": "application/json" } }
      );
      setBookedNights(response.data.bookedNights || 0);
    } catch (error) {
      console.error("Error fetching booked nights:", error);
    } finally {
      updateLoadingState("bookedNights", false);
    }
  };

  // Fetch monthly revenue comparison
  const fetchMonthlyRevenueData = async () => {
    if (!cognitoUserId) return console.error("Cognito User ID is missing.");

    updateLoadingState("monthlyRevenue", true);
    try {
      const response = await axios.post(
        "https://dcp1zwsq7c.execute-api.eu-north-1.amazonaws.com/default/GetMonthlyComparison",
        { hostId: cognitoUserId },
        { headers: { "Content-Type": "application/json" } }
      );
      setMonthlyRevenueData(response.data);
    } catch (error) {
      console.error("Error fetching monthly revenue data:", error);
    } finally {
      updateLoadingState("monthlyRevenue", false);
    }
  };

  // Fetch all necessary data when user ID is available
  useEffect(() => {
    if (cognitoUserId) {
      fetchRevenueData();
      fetchBookedNights();
      fetchMonthlyRevenueData();
    }
  }, [cognitoUserId]);

  return (
    <main className="hr-page-body hr-container">
      <h2>Revenues</h2>

      <section className="hr-host-revenues">
        <div className="hr-pages">
          <Pages />
        </div>
        <div className="hr-content">
          {loadingStates.user || loadingStates.revenue ? (
            <div className="hr-revenue-spinner-container">
              <ClipLoader size={100} color="#3498db" loading={true} />
            </div>
          ) : (
            <>
              {stripeStatus === "none" && (
                <div>
                  <h3>No Stripe Account Found</h3>
                  <button onClick={() => window.open(stripeLoginUrl, "_blank")}>Connect Stripe</button>
                </div>
              )}
              {stripeStatus === "complete" && (
                <>
                  <div className="hr-revenue-overview">
                    <h3>Revenue Overview</h3>
                    <RevenueOverview title="Total Revenue" value={`$${totalRevenue}`} />
                  </div>
                  <div className="hr-monthly-comparison">
                    <h3>Monthly Comparison</h3>
                    <MonthlyComparison data={monthlyRevenueData} />
                  </div>
                  <div className="hr-cards">
                    <OccupancyRateCard {...occupancyData} />
                    <ADRCard hostId={cognitoUserId} />
                    <RevPARCard />
                    <BookedNights />
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
