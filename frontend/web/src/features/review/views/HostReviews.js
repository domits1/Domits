import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import { requestReview } from "../services/reviewAPI";
import ReviewPerformance from "./ReviewPerformance";
import DecliningPropertyRatings from "./DecliningPropertyRatings";
import ReceivedReviews from "../components/ReceivedReviews";
import styles from "../styles/HostReviews.module.css";

const REVIEW_VIEWS = [
  { key: "reviews", label: "Review" },
  { key: "performance", label: "Review performance over time" },
  { key: "trends", label: "Properties with declining ratings" },
];

export default function HostReviews() {
  const [activeView, setActiveView] = useState("reviews");
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [respondableReviews, setRespondableReviews] = useState({});
  const [eligibilityError, setEligibilityError] = useState("");
  const [eligibilityRetry, setEligibilityRetry] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    Auth.currentUserInfo()
      .then((user) => {
        if (!active) return;
        if (user?.attributes?.sub) setUserId(user.attributes.sub);
        else navigate("/login");
      })
      .catch(() => {
        if (active) navigate("/login");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    setReceivedReviews([]);
    requestReview("GET", { scope: "received" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load your reviews. Please try again.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Could not load your reviews. Please try again.");
        if (active) setReceivedReviews(data);
      })
      .catch(() => {
        if (active) setError("Could not load your reviews. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);

  useEffect(() => {
    let active = true;
    setRespondableReviews({});
    setEligibilityError("");
    if (userId) {
      requestReview("GET", { scope: "respondable" }).then(async (response) => {
        if (!response.ok) throw new Error("Could not load response eligibility");
        const data = await response.json();
        if (!Array.isArray(data) || data.some((review) => typeof review?.id !== "string")) {
          throw new Error("Invalid response eligibility");
        }
        if (active) setRespondableReviews(Object.fromEntries(data.map((review) => [review.id, review])));
      }).catch(() => {
        if (active) setEligibilityError("Could not check which reviews you can respond to. Your received reviews are still available.");
      });
    }
    return () => { active = false; };
  }, [userId, eligibilityRetry]);

  return (
    <main className={`page-body ${styles.page}`}>
      <header className={styles.pageHeading}>
        <h2>Reviews</h2>
        <p>Manage guest feedback and track your performance.</p>
      </header>
      <nav className={styles.viewMenu} aria-label="Review views">
        {REVIEW_VIEWS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={activeView === key}
            aria-controls="review-view"
            onClick={() => setActiveView(key)}>
            {label}
          </button>
        ))}
      </nav>
      <div id="review-view" role="region" aria-label={REVIEW_VIEWS.find(({ key }) => key === activeView).label}>
        {activeView === "performance" && userId && <ReviewPerformance userId={userId} />}
        {activeView === "trends" && userId && <DecliningPropertyRatings userId={userId} />}
        {activeView !== "reviews" && !userId && <p role="status">Loading your account...</p>}
        {activeView === "reviews" && (
          <ReceivedReviews
            userId={userId}
            reviews={receivedReviews}
            respondableReviews={respondableReviews}
            eligibilityError={eligibilityError}
            onEligibilityRetry={() => setEligibilityRetry((value) => value + 1)}
            loading={loading}
            error={error}
            onRetry={() => setRetry((value) => value + 1)}
          />
        )}
      </div>
    </main>
  );
}
