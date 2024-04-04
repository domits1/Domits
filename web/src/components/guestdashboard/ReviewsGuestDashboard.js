import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Pages from "./Pages.js";
import deleteIcon from "../../images/icons/cross.png";
import './guestdashboard.css';
import { Auth } from "aws-amplify";

function GuestReviews() {
    const [reviews, setReviews] = useState([]);
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
            }
        };

        if (userId) {
            retrieveReviews();
        }
    }, [userId]); // This effect depends on userId, it runs when userId is set

    function asyncDeleteReview(review) {
        console.log(review);
        console.log(review['reviewId'])
    }
    return (
        <div className="container">
            <h2>Reviews</h2>
            <div className="dashboards">
                <Pages />
                <div className="contentContainer">
                    <div className="reviewColumn">
                        <div className="reviewBox">
                            <p className="reviewText">My reviews({reviews.length})</p>
                            {reviews.length > 0 ? (
                            reviews.map((review, index) => (
                            <div key={index} className="review-tab">
                            <h2 className="review-header">{review.title}</h2>
                            <p className="review-content">{review.content}</p>
                            <p className="review-date">Written on: {review.date}</p>
                            <button
                                      onClick={() => asyncDeleteReview(review)}
                                      className="review-delete"
                                    >
                                    <img src={deleteIcon} className="cross" alt="Delete"></img></button>
                            </div>
                            ))
                            ) : (
                            <div className="reviewBox">
                            <p className="review-alert">It appears that you have not written any reviews yet...</p>
                            </div>
                            )}
                        </div>
                    </div>
                    <div className="reviewColumn">
                        <div className="reviewBox">
                            <p className="reviewText">Disputes</p>
                        </div>
                        <div className="reviewBox">
                            <p className="reviewText">Recent reviews</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestReviews;