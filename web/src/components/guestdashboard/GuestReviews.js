import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Pages from "./Pages.js";
import spinner from "../../images/spinnner.gif";
import deleteIcon from "../../images/icons/cross.png";
import styles from '../hostdashboard/HostReviews.module.css';
import { Auth } from "aws-amplify";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";

function GuestReviews() {
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoading2, setIsLoading2] = useState(true);
    const [receivedReviews, setReceivedReviews] = useState([]);
    const [userId, setUserId] = useState(null);
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
                history.push('/login'); // Redirect to login on error
            }
        };

        checkUserLoggedIn();
    }, [history]);

    useEffect(() => {
        const retrieveReviews = async () => {
            if (!userId) {
                console.log("No user id")
                return;
            }

            const options = {
                userIdFrom: userId
            };
            setIsLoading(true);
            try {
                const response = await fetch('https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReviews', {
                    method: 'POST',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setReviews(data);
            } catch (error) {
                console.error(error);
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
                console.log("No user id")
                return;
            }
            console.log(userId);
            const options = {
                itemIdTo: userId
            };
            setIsLoading2(true);
            try {
                const response = await fetch('https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReceivedReviews', {
                    method: 'POST',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setReceivedReviews(data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading2(false);
            }
        };

        if (userId) {
            retrieveReceivedReviews();
        }
    }, [userId]);

    const asyncDeleteReview = async (review) => {
        if(confirm("Are you sure you want to delete this review?") == true) {
            let reviewId = review["reviewId "];

            const options = {
                "reviewId ": reviewId
            };

            try {
                const response = await fetch('https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/DeleteReview', {
                    method: 'DELETE',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const updatedReviews = reviews.filter(r => r["reviewId "] !== reviewId);
                setReviews(updatedReviews);
            } catch (error) {
                console.error(error);
            }
        }
    }
    return (
        <main className="page-body">
            <h2>Reviews</h2>
            <div className={styles.reviewGrid}>
                <Pages />
                <div className={styles.contentContainer}>
                    <div className={styles.reviewColumn}>
                        <div className={styles.reviewBox}>
                            <p className={styles.boxText}>My reviews({reviews.length})</p>
                            {isLoading ? (
                                    <div>
                                        <img src={spinner}/>
                                    </div>
                                ) :
                                reviews.length > 0 ? (
                                    reviews.map((review, index) => (
                                        <div key={index} className={styles.reviewTab}>
                                            <h2 className={styles.reviewHeader}>{review.title}</h2>
                                            <p className={styles.reviewContent}>{review.content}</p>
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
                            {isLoading ? (
                                    <div>
                                        <img src={spinner}/>
                                    </div>
                                ) :
                                receivedReviews.length > 0 ? (
                                    receivedReviews.map((receivedReview, index) => (
                                        <div key={index} className={styles.reviewTab}>
                                            <h2 className={styles.reviewHeader}>{receivedReview.title}</h2>
                                            <p className={styles.reviewContent}>{receivedReview.content}</p>
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

export default GuestReviews;