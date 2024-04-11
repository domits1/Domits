import React, { useEffect, useState } from "react";
import Pages from "./Pages";
import './HostHomepage.css'
import add from "../../images/icons/host-add.png";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";

function HostListings() {
    const [accommodations, setAccommodations] = useState([]);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                await setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        setUserIdAsync();
    }, []);

    useEffect(() => {
        const fetchAccommodations = async () => {
            if (!userId) {
                console.log("No user id")
                return;
            }
            const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation', {
                method: 'POST',
                body: JSON.stringify({ OwnerId: userId }),
                headers: {'Content-type': 'application/json; charset=UTF-8',
            }
         });
            if (!response.ok) {
                throw new Error('Failed to fetch');
        }
            // Extracting the response body
            const data = await response.json();

            // Now 'responseData' should contain your {statusCode, headers, body}
            // Check if 'responseData.body' exists and is a string
            if (data.body && typeof data.body === 'string') {
                // Parse the JSON string inside 'responseData.body'
                const accommodationsArray = JSON.parse(data.body);
                // Ensure the parsed data is an array before setting the state
                if (Array.isArray(accommodationsArray)) {
                    setAccommodations(accommodationsArray);
                } else {
                    // Handle the case where the parsed data is not an array
                    console.error("Parsed data is not an array:", accommodationsArray);
                    setAccommodations([]); // Setting a default or handling as needed
                }
            } else {
                // Handle unexpected structure
                console.error("Unexpected responseData structure:", data);
            }
        };

        if (userId) {
            fetchAccommodations().catch(console.error);
        }
    }, [userId]);


    return (
        <div className="container">
            <h2>Listings</h2>
            <div className="dashboard">
                <Pages />
                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="wijzer addAcco" onClick={() => navigate("/enlist")} style={{maxWidth: 250,}}>
                            <img src={add} alt="add"></img>
                            <p>Add new accommodation</p>
                        </div>
                        <div className="box fullBox">
                            <p className="">Current listings</p>
                            {accommodations.length > 0 ? (
                                accommodations.map((accommodation) => (
                                    <div key={accommodation.ID} className="review-tab">
                                        <p>Accommodation: {accommodation.Title}</p>
                                        <p>Location: {accommodation.Country}, {accommodation.City}, {accommodation.Street}</p>
                                        <p>Type: {accommodation.Type}</p>
                                        <p>Room Type: {accommodation.Roomtype}</p>
                                        <p>Guests Allowed: {accommodation.Guests}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="reviewBox">
                                    <p className="review-alert">It appears that you have not listed any accommodations yet...</p>
                                </div>
                            )}
                        </div>
                        <div className="box">
                            <p className="">Pending</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}




export default HostListings;