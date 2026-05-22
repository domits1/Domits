import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };
import spinner from "../../images/spinnner.gif";
import deleteIcon from "../../images/icons/cross.png";
import { Auth } from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

function GuestReviews() {
  const [reviews, setReviews] = useState([]);
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoading2, setIsLoading2] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

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

    const retrieveReviews = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          "https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReviews",  
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("FetchReviews error:", e);
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    retrieveReviews();
  }, [userId]);

  
  useEffect(() => {
    if (!userId) return;

    const retrieveReceivedReviews = async () => {
      setIsLoading2(true);
      try {
        const res = await fetch(
          "https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReceivedReviews",
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReceivedReviews(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("FetchReceivedReviews error:", e);
        setReceivedReviews([]);
      } finally {
        setIsLoading2(false);
      }
    };

    retrieveReceivedReviews();
  }, [userId]);

 
  const asyncDeleteReview = async (review) => {
    if (!window.confirm(t?.reviews?.deleteConfirm || "Are you sure you want to delete this review?")) return;

    
    const reviewId = review["reviewId "];

    try {
      const res = await fetch(
        "https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/DeleteReview",
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setReviews((prev) => prev.filter((r) => r["reviewId "] !== reviewId));
    } catch (e) {
      console.error("DeleteReview error:", e);
    }
  };

  return (
    <main className="page-body">
      <h2>{t?.reviews?.title || "Reviews"}</h2>

      <div className="reviewGrid">
        <div className="contentContainer">

          <div className="reviewColumn">

            <div className="reviewBox">
              <p className="boxText">{t?.reviews?.myReviews || "My reviews"} ({reviews.length})</p>

              {isLoading ? (
                <div>
                  <img src={spinner} alt="Loading..." />
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <div key={index} className="reviewTab">
                    <h2 className="reviewHeader">{review.title}</h2>
                    <p className="reviewContent">{review.content}</p>
                    <p className="reviewDate">
                      {t?.reviews?.writtenOn || "Written on:"} {DateFormatterDD_MM_YYYY(review.date)}
                    </p>
                    <button
                      onClick={() => asyncDeleteReview(review)}
                      className="reviewDelete"
                      type="button"
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      <img src={deleteIcon} className="cross" alt="Delete" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="reviewAlert">
                  {t?.reviews?.noWrittenReviews || "It appears that you have not written any reviews yet..."}
                </p>
              )}
            </div>

            {/* Received reviews */}
            <div className="reviewBox">
              <p className="boxText">
                {t?.reviews?.receivedReviews || "Received reviews"} ({receivedReviews.length})
              </p>

              {isLoading2 ? (
                <div>
                  <img src={spinner} alt="Loading..." />
                </div>
              ) : receivedReviews.length > 0 ? (
                receivedReviews.map((receivedReview, index) => (
                  <div key={index} className="reviewTab">
                    <h2 className="reviewHeader">{receivedReview.title}</h2>
                    <p className="reviewContent">{receivedReview.content}</p>
                    <p className="reviewDate">
                      {t?.reviews?.writtenOn || "Written on:"} {DateFormatterDD_MM_YYYY(receivedReview.date)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="reviewAlert">
                  {t?.reviews?.noReceivedReviews || "It appears that you have not received any reviews yet..."}
                </p>
              )}
            </div>
          </div>

          <div className="reviewColumn">
            <div className="reviewBox">
              <p className="boxText">{t?.reviews?.disputes || "Disputes"}</p>
            </div>
            <div className="reviewBox">
              <p className="boxText">{t?.reviews?.recentReviews || "Recent reviews"}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default GuestReviews;
