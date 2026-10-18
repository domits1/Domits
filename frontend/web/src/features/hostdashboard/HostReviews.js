import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Pages from "./Pages.js";
import spinner from "../../images/spinnner.gif";
import deleteIcon from "../../images/icons/cross.png";
import styles from './HostReviews.module.css';
import general from './HostDashboard.module.scss'
import { Auth } from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

import { requestReview } from "../review/services/reviewAPI";
import HostResponseForm from "../review/HostResponseForm";
import ReviewPerformance from "./ReviewPerformance";
import DecliningPropertyRatings from "../review/DecliningPropertyRatings";
import reviewStyles from "../review/ReviewPage.module.css";

function HostReviews() {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoading2, setIsLoading2] = useState(true);
    const [receivedReviews, setReceivedReviews] = useState([]);
    const [respondableReviews, setRespondableReviews] = useState({});
    const [eligibilityError, setEligibilityError] = useState("");
    const [eligibilityRetry, setEligibilityRetry] = useState(0);
    const [userId, setUserId] = useState(null);
  const [reviewError, setReviewError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        setUserIdAsync();
    }, []);

     useEffect(() => {
            const checkUserLoggedIn = async () => {
                try {
                    const userInfo = await Auth.currentUserInfo();
                    if (userInfo) {
                        setUserId(userInfo.attributes.sub);
                    } else {
                        // If no user info, redirect to the login page
                        navigate('/login');
                    }
                } catch (error) {
                    console.error("Error checking user login status:", error);
                    navigate('/login'); // Redirect to login on error
                }
            };

            checkUserLoggedIn();
        }, [navigate]);

    useEffect(() => {
        const retrieveReviews = async () => {
            if (!userId) {
                return;
            }

            setIsLoading(true);
            try {
                const response = await requestReview("GET", { scope: "written" });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setReviews(data);
            } catch (error) {
                setReviewError("Could not load or update your reviews. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            retrieveReviews();
        }
    }, [userId]); // This effect depends on userId, it runs when userId is set
    useEffect(() => {
        let active = true;
        const retrieveReceivedReviews = async () => {
            if (!userId) {
                return;
            }
            setIsLoading2(true);
            try {
                const response = await requestReview("GET", { scope: "received" });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                if (!Array.isArray(data)) throw new Error("Invalid review list");
                if (active) setReceivedReviews(data);
            } catch {
                if (active) setReviewError("Could not load or update your reviews. Please try again.");
            } finally {
                if (active) setIsLoading2(false);
            }
        };

        if (userId) {
            setReceivedReviews([]);
            retrieveReceivedReviews();
        }
        return () => { active = false; };
    }, [userId]);

    useEffect(() => {
        let active = true;
        setRespondableReviews({});
        setEligibilityError("");
        if (userId) {
            const retrieveEligibility = async () => {
                try {
                    const response = await requestReview("GET", { scope: "respondable" });
                    if (!response.ok) throw new Error("Could not load response eligibility");
                    const data = await response.json();
                    if (!Array.isArray(data) || data.some((review) => typeof review?.id !== "string")) {
                        throw new Error("Invalid response eligibility");
                    }
                    if (active) setRespondableReviews(Object.fromEntries(data.map((review) => [review.id, review])));
                } catch {
                    if (active) setEligibilityError("Could not check which reviews you can respond to. Your received reviews are still available.");
                }
            };
            // Eligibility failures are handled inside this task without hiding received reviews.
            void retrieveEligibility();
        }
        return () => { active = false; };
    }, [userId, eligibilityRetry]);

    const asyncDeleteReview = async (review) => {
        if(window.confirm("Are you sure you want to delete this review?") === true) {
            let reviewId = review.id;


                    try {
                         const response = await requestReview("DELETE", { reviewId });
                           if (!response.ok) {
                               throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            const updatedReviews = reviews.filter(r => r.id !== reviewId);
                            setReviews(updatedReviews);
                          } catch (error) {
                            setReviewError("Could not load or update your reviews. Please try again.");
                          }
        }
    }
    return (
        <main className="page-body">
            <h2>Reviews</h2>
      {reviewError && <p role="alert">{reviewError}</p>}
            <div className={styles.reviewGrid}>
                <Pages />
                <div className={styles.contentContainer}>
                    {userId && <ReviewPerformance userId={userId} />}
                    {userId && <DecliningPropertyRatings userId={userId} />}
                    <div className={styles.reviewColumn}>
                        <div className={styles.reviewBox}>
                            <p className={styles.boxText}>My reviews ({reviews.length})</p>
                            {isLoading ? (
                                    <div className={general.loadingContainer}>
                                        <img className={general.spinner} src={spinner} alt="Loading reviews"/>
                                    </div>
                                ) :
                            reviews.length > 0 ? (
                                reviews.map((review, index) => (
                                    <div key={index} className={styles.reviewTab}>
                                        <h2 className={styles.reviewHeader}>{review.title}</h2>
                                        <p className={`${styles.reviewContent} ${reviewStyles.reviewText}`}>{review.content}</p>
                                        <p className={styles.reviewDate}>Written on: {DateFormatterDD_MM_YYYY(review.date)}</p>
                                        <button
                                            onClick={() => asyncDeleteReview(review)}
                                            className={styles.reviewDelete}
                                        >
                                            <img src={deleteIcon} className="cross" alt="Delete"></img></button>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.reviewAlert}>It appears that you have not written any reviews yet...</p>
                            )}
                        </div>
                        <div className={styles.reviewBox}>
                            <p className={styles.boxText}>Received reviews({receivedReviews.length})</p>
                            {eligibilityError && <>
                                <p role="alert">{eligibilityError}</p>
                                <button type="button" onClick={() => setEligibilityRetry((value) => value + 1)}>Retry response eligibility</button>
                            </>}
                            {isLoading2 ? (
                                    <div className={general.loadingContainer}>
                                        <img className={general.spinner} src={spinner} alt="Loading reviews"/>
                                    </div>
                                ) :
                                receivedReviews.length > 0 ? (
                                    receivedReviews.map((receivedReview) => (
                                        <div key={receivedReview.id} className={styles.reviewTab}>
                                        <h2 className={styles.reviewHeader}>{receivedReview.title}</h2>
                                        <p className={`${styles.reviewContent} ${reviewStyles.reviewText}`}>{receivedReview.content}</p>
                                        <p className={styles.reviewDate}>Written on: {DateFormatterDD_MM_YYYY(receivedReview.date)}</p>
                                        {Object.hasOwn(respondableReviews, receivedReview.id) && (
                                            <HostResponseForm review={respondableReviews[receivedReview.id]} />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.reviewAlert}>You haven’t received any reviews yet.</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.reviewColumn}>
                        <div className={styles.reviewBox}>
                            <p className={styles.boxText}>Disputes</p>
                        </div>
                        <div className={styles.reviewBox}>
                            <p className={styles.boxText}>Recent reviews</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default HostReviews;
