import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import './HostDistribution.css';
import airbnb_logo from "../../images/icon-airbnb.png";
import {Auth} from "aws-amplify";

function HostDistribution() {
    const [dates, setDates] = useState([]);
    const [userId, setUserId] = useState(null);
    const [accommodations, setAccommodations] = useState([]);

    useEffect(() => {
        const asyncSetUserId = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        asyncSetUserId();
    }, []);

    useEffect(() => {
            const handleGetAccomodations = async () => {
                if (!userId) {
                    return;
                } else {
                    console.log("User id:", userId);
                    try {
                        const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation', {
                            method: 'POST',
                            body: JSON.stringify({OwnerId: userId}),
                            headers: {
                                'Content-type': 'application/json; charset=UTF-8',
                            }
                        });
                        if (!response.ok) {
                            throw new Error('Failed to fetch');
                        }
                        const data = await response.json();
                        console.log(data);

                        if (data.body && typeof data.body === 'string') {
                            const accommodationsArray = JSON.parse(data.body);
                            if (Array.isArray(accommodationsArray)) {
                                setAccommodations(accommodationsArray);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to fetch accommodations:', error);
                    }
                }
            };

            handleGetAccomodations();
        }, [userId]
    );

    useEffect(() => {
        const asyncGetDates = async () => {
            try {
                const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetDateRangeFromAccomodation', {
                    method: 'POST',
                    body: JSON.stringify({OwnerId: accommodations.ID}),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
                const data = await response.json();
                console.log(data);

                if (data.body && typeof data.body === 'string') {
                    const datesArray = JSON.parse(data.body);
                    if (Array.isArray(datesArray)) {
                        setDates(datesArray);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch dates:', error);
            }
        };

        asyncGetDates()
    }, []);


    return (
        <div className="container">
            <h2>Connected channels</h2>
            <div className="host-dist-content">
                <Pages/>
                <div className="contentContainer-channel">
                    <div className="host-dist-box-row">
                        <img className="channelLogo" src={airbnb_logo}></img>
                        <p className="channelFont">Airbnb</p>
                        <p>Disabled</p>
                        <button className="" onClick={() => setUserId()}>Manage</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HostDistribution;
