import React, { useEffect } from "react";
import Pages from "./Pages.js";
import './guestdashboard.css';
import { Auth } from "aws-amplify";

let userId = null;
function GuestReviews() {
    const setUserId = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            userId = userInfo.attributes.sub
        } catch (error) {
            console.error("Error setting user id:", error);
        }
    };

    useEffect(() => {
        setUserId();
    });
    return (
        <div className="container">
            <h2>Reviews</h2>
            <div className="dashboards">
                <Pages />

                <div className="contentContainer">
                    <div className="reviewColumn">
                        <div className="reviewBox">
                            <p className="reviewText">Earnings</p>
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