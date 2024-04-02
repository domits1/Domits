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
           console.log(data)
           return data;
        } catch (error) {
            console.log(error)
        }
    }

    async function displayReviews() {
        const reviews = await retrieveReviews();

        // Get the parent div by its ID
          const parentDiv = document.getElementByClassName('reviewColumn');

          // Loop through the array of JSON objects
          reviews.forEach(review => {
            // Create a new div element
            const newDiv = document.createElement('div');

            // Optionally, add content to your div (e.g., from the JSON object)
            newDiv.innerHTML = `<h2>${obj.name}</h2><p>${obj.description}</p>`;

            // Append the new div to the parent div
            parentDiv.appendChild(newDiv);
            });
    }

    useEffect(() => {
        displayReviews();
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