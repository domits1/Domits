import React, {useEffect, useState} from "react";
import Pages from "./Pages";
import Calendar from "./Calendar";
import chevron from "../../images/icons/chevron-horizontal.png";
import returner from "../../images/icons/return-icon.png";
import './HostHomepage.css'
import {Auth} from "aws-amplify";
import spinner from "../../images/spinnner.gif";


function HostCalendar() {
    const [accommodations, setAccommodations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [selectedAccommodation, setSelectedAccommodation] = useState(null);

    const handleSelectAccommodation = (event) => {
        const accommodationId = event.target.value;
        console.log(event.target.value);
        const accommodation = accommodations.find(accommodation => accommodation.ID === accommodationId);
        setSelectedAccommodation(accommodation);
        console.log(accommodation);
    };
    useEffect(() => {
        if (selectedAccommodation) {
            console.log(selectedAccommodation);
        }
    }, [selectedAccommodation]);

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
                }
            }
        };

        if (userId) {
            fetchAccommodations().catch(console.error);
        }
    }, [userId]);
    return (
        <div className="container">
            <h2>Calendar</h2>
            <div className="dashboard">
                <Pages />
                {isLoading ? (
                        <div>
                            <img src={spinner}/>
                        </div>
                    ) :
                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="box locationBox">
                            <select className="locationBox"
                                    onChange={handleSelectAccommodation}>
                                <option value="">Select an Accommodation</option>
                                {accommodations.map(accommodation => (
                                    <option key={accommodation.ID}
                                            value={accommodation.ID}>
                                        {accommodation.Title},
                                        {" " + accommodation.Country},
                                        {" " + accommodation.City},
                                        {" " + accommodation.Street},
                                        {" " + accommodation.PostalCode}
                                    </option>
                                ))}
                            </select>
                            <button className="undo-btn">
                                <img src={returner} alt="Return"></img>
                                <p className="undo-txt">Undo</p>
                            </button>
                        </div>
                        <div className="box">
                            {selectedAccommodation !== null && selectedAccommodation !== undefined ? (
                                <p>Booking availability for
                                    {" " + selectedAccommodation.Title}
                                </p>
                            ) : (
                                <p>Please select your Accommodation</p>
                            )}
                            <div className="locationBox">
                                <div className="boxColumns locationContent">
                                    <Calendar/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>}
            </div>
        </div>
    );
}


export default HostCalendar;