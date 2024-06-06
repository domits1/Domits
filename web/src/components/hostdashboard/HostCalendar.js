import React, {useEffect, useState} from "react";
import Pages from "./Pages";
import Calendar from "./Calendar";
import chevron from "../../images/icons/chevron-horizontal.png";
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
        const accommodation = accommodations.find(accommodation => accommodation.ID === accommodationId);
        setSelectedAccommodation(accommodation);
    };

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
                    const data = await response.json();

                    if (data.body && typeof data.body === 'string') {
                        const accommodationsArray = JSON.parse(data.body);
                        if (Array.isArray(accommodationsArray)) {
                            setAccommodations(accommodationsArray);
                        } else {
                            console.error("Parsed data is not an array:", accommodationsArray);
                            setAccommodations([]);
                        }
                    }
                } catch (error) {
                    console.error("Unexpected error:", error);
                } finally {
                    setIsLoading(false);
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
                    ) : accommodations.length < 1 ? (
                        <p>No accommodations found...</p>
                    ) :
                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="box locationBox selector">
                            <select className="locationBox"
                                    onChange={handleSelectAccommodation}>
                                <option value="" className="select-option">
                                    Select your Accommodation
                                </option>
                                {accommodations.map(accommodation => (
                                    <option key={accommodation.ID}
                                            value={accommodation.ID}>
                                        {accommodation.Title}
                                    </option>
                                ))}
                            </select>

                        </div>
                        {selectedAccommodation !== null && selectedAccommodation !== undefined ? (
                        <div className="calendar-box">
                            <p>Booking availability for
                                    {" " + selectedAccommodation.Title}
                            </p>
                            <div className="locationBox">
                                <div className="boxColumns locationContent">
                                    <Calendar passedProp={selectedAccommodation} isNew={false}/>
                                </div>
                            </div>
                        </div>
                            ) : (
                                <div className="alert-message">Please select your Accommodation first</div>
                            )
                        }
                    </div>
                </div>}
            </div>
        </div>
    );
}


export default HostCalendar;