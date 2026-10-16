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
import ReviewPerformance from "./ReviewPerformance";
import DecliningPropertyRatings from "../review/DecliningPropertyRatings";
import reviewStyles from "../review/ReviewPage.module.css";

function HostReviews() {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoading2, setIsLoading2] = useState(true);
    const [receivedReviews, setReceivedReviews] = useState([]);
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
                setReceivedReviews(data);
            } catch (error) {
                setReviewError("Could not load or update your reviews. Please try again.");
            } finally {
                setIsLoading2(false);
            }
        };

        if (userId) {
            retrieveReceivedReviews();
        }
    }, [userId]);

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
                            {isLoading2 ? (
                                    <div className={general.loadingContainer}>
                                        <img className={general.spinner} src={spinner} alt="Loading reviews"/>
                                    </div>
                                ) :
                                receivedReviews.length > 0 ? (
                                    receivedReviews.map((receivedReview, index) => (
                                        <div key={index} className={styles.reviewTab}>
                                        <h2 className={styles.reviewHeader}>{receivedReview.title}</h2>
                                        <p className={`${styles.reviewContent} ${reviewStyles.reviewText}`}>{receivedReview.content}</p>
                                        <p className={styles.reviewDate}>Written on: {DateFormatterDD_MM_YYYY(receivedReview.date)}</p>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.reviewAlert}>It appears that you have not received any reviews yet...</p>
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
