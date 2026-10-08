import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import spinner from "../../images/spinnner.gif";
import { Auth } from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

import { requestReview } from "../review/services/reviewAPI";
import reviewStyles from "../review/ReviewPage.module.css";
import GuestReviewHistory from "../review/GuestReviewHistory";

function GuestReviews() {
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [isLoading2, setIsLoading2] = useState(true);
  const [userId, setUserId] = useState(null);
  const [reviewError, setReviewError] = useState("");
  const navigate = useNavigate();

  // Get user once & redirect if not logged in
  useEffect(() => {
    (async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        const sub = userInfo?.attributes?.sub;
        if (sub) setUserId(sub);
        else navigate("/login");
      } catch (err) {
        console.error("Auth/currentUserInfo error:", err);
        navigate("/login");
      }
    })();
  }, [navigate]);

  
  useEffect(() => {
    if (!userId) return;

    const retrieveReceivedReviews = async () => {
      setIsLoading2(true);
      try {
        const res = await requestReview("GET", { scope: "received" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReceivedReviews(Array.isArray(data) ? data : []);
      } catch (e) {
        setReviewError("Could not load received reviews. Please try again.");
        setReceivedReviews([]);
      } finally {
        setIsLoading2(false);
      }
    };

    retrieveReceivedReviews();
  }, [userId]);

 
  return (
    <main className="page-body">
      <h2>Reviews</h2>
      {reviewError && <p role="alert">{reviewError}</p>}

      <div className="reviewGrid">
        <div className="contentContainer">
          
          <div className="reviewColumn">
            
            {userId && <GuestReviewHistory key={userId} />}

            {/* Received reviews */}
            <div className="reviewBox">
              <p className="boxText">
                Received reviews ({receivedReviews.length})
              </p>

              {isLoading2 ? (
                <div>
                  <img src={spinner} alt="Loading..." />
                </div>
              ) : receivedReviews.length > 0 ? (
                receivedReviews.map((receivedReview, index) => (
                  <div key={index} className="reviewTab">
                    <h2 className="reviewHeader">{receivedReview.title}</h2>
                    <p className={`reviewContent ${reviewStyles.reviewText}`}>{receivedReview.content}</p>
                    <p className="reviewDate">
                      Written on: {DateFormatterDD_MM_YYYY(receivedReview.date)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="reviewAlert">
                  It appears that you have not received any reviews yet...
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="reviewColumn">
            <div className="reviewBox">
              <p className="boxText">Disputes</p>
            </div>
            <div className="reviewBox">
              <p className="boxText">Recent reviews</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default GuestReviews;
