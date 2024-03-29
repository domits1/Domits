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

    async function retrieveReviews() {
        await setUserId();
        if(userId === null) {
            console.log("No user id")
            return;
        }

        const options = {
            userIdFrom: userId
        }

        try {
            const response = await fetch('https://gwl35zqai9.execute-api.eu-north-1.amazonaws.com/default/params', {
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
           console.log(data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        retrieveReviews();
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