import React, { useEffect, useState } from "react";
import Pages from "./Pages";
import './HostHomepage.css'
import add from "../../images/icons/host-add.png";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";
import house from "../../images/house1.jpeg";
import spinner from "../../images/spinnner.gif";

function HostListings() {
    const [accommodations, setAccommodations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0'); // Ensures the day is two digits
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is zero-based; +1 to make it 1-based
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }
    const getFeatures = (features) => {
        return Object.entries(features)
            .filter(([key, value]) => value === true)
            .map(([key, value]) => key);
    }
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
            setIsLoading(true);
            if (!userId) {
                console.log("No user id")
                return;
            } else {
                try {
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
                    }
                } catch (error) {
                    // Error Handling
                    console.error("Unexpected error:", error);
                } finally {
                    setIsLoading(false); // End loading regardless of promise outcome
                    for (let acc in accommodations) {
                        console.log(accommodations[acc].Images)
                    }
                }
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
                            <p className="header">Current listings</p>
                            {isLoading ? (
                                <div>
                                    <img src={spinner}/>
                                </div>
                            ) : accommodations.length > 0 ? (
                                accommodations.map((accommodation) => (
                                    <div key={accommodation.ID} className="accommodation-tab">
                                        <div className="accommodation-left">
                                            <p className="accommodation-title">{accommodation.Title}</p>
                                            <p>{accommodation.Country},
                                                {accommodation.City},
                                                {accommodation.Street},
                                                {accommodation.PostalCode}
                                            </p>
                                            <img src={accommodation.Images.image1} alt="icon"
                                                 className="accommodation-img"/>
                                        </div>
                                        <div className="accommodation-right">
                                        <p>Description: {accommodation.Description}</p>
                                            <p>Listed on: {formatDate(accommodation.createdAt)}</p>
                                            <p>Measurements: {accommodation.Measurements}m²</p>
                                            <p>Features: {accommodation.Features.length > 0 ? (
                                                getFeatures(accommodation.Features)) : ('none')}
                                            </p>
                                            <p>Rent: ${accommodation.Rent}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="accommodation-box">
                                    <p className="accommodation-alert">It appears that you have not listed any accommodations yet...</p>
                                </div>
                            )}
                        </div>
                        <div className="box">
                            <p className="header">Pending</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}




export default HostListings;