import React from "react";
import Pages from "./Pages.js";
import './guestdashboard.css';

function GuestReviews() {

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