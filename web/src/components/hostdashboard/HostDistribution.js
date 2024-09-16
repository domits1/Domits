import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import './HostDistribution.css';
import airbnb_logo from "../../images/icon-airbnb.png";
import three_dots from "../../images/three-dots-grid.svg";
// import arrow_left from "../../images/arrow-left-icon.svg";
// import arrow_right from "../../images/arrow-right-icon.svg";
import {Auth} from "aws-amplify";
import {formatDate, formatDescription, formatLocation, downloadICal} from "../utils/iCalFormat.js";

function HostDistribution() {
    const [dates, setDates] = useState([]);
    const [userId, setUserId] = useState(null);
    const [accommodations, setAccommodations] = useState([]);
    const [status, setStatus] = useState('Disabled');

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

    const handleICal = () => {
        let accomStatus = 'TENTATIVE';
        if (accommodations && accommodations.length > 0) {
            if (accommodations[0].Drafted !== true) {
                accomStatus = 'CONFIRMED';
            }
            const sampleEvent = {
                uid: accommodations[0].ID,
                stamp: formatDate(new Date()),
                start: formatDate(accommodations[0].DateRanges[0].startDate),
                end: formatDate(accommodations[0].DateRanges[0].endDate),
                summary: accommodations[0].Title,
                status: accomStatus,
                description: formatDescription(accommodations[0].Description),
                checkIn: formatDate(accommodations[0].DateRanges[0].startDate),
                checkOut: formatDate(accommodations[0].DateRanges[0].endDate),
                bookingId: accommodations[0].ID,
                location: formatLocation(accommodations[0])
            }
            downloadICal(sampleEvent);
        }
    }

    const handleEmptyButton = () => {
        alert("This button is not functional yet");
    }

    return (
        <div className="container">
            <div className="host-dist-header">
                <h2 className="connectedChannelTitle">Connected channels</h2>
                <button className="addChannelButton" onClick={handleICal}>
                    Temp button to get iCal .isc file
                </button>
                <button className="addChannelButton" onClick={handleEmptyButton}>+ Add
                    channel
                </button>
            </div>
            <div className="host-dist-content">
                <Pages/>
                <div className="contentContainer-channel">
                    {[...Array(6)].map((_, index) => (
                        <div className="host-dist-box-container">
                            <div className="host-dist-box-row" key={index}>
                                <img className="channelLogo" src={airbnb_logo} alt="Airbnb Logo"/>
                                <p className="channelFont">Airbnb</p>
                                <p className={`channelStatus ${status === 'Enabled' ? 'Enabled' : 'Disabled'}`}> {status} </p>
                                <p className="totalMappedRooms">0 Mapped rooms</p>
                                <button className="channelManageButton" onClick={handleEmptyButton}>Manage</button>
                                <button className="threeDotsButton" onClick={handleEmptyButton}>
                                    <img src={three_dots} alt="Three Dots"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {/*<div className="host-dist-box-container">*/}
                    {/*/!*    <div className="host-dist-box-row">*!/*/}
                    {/*/!*    <img className="channelLogo" src={airbnb_logo}></img>*!/*/}
                    {/*/!*    <p className="channelFont">Airbnb</p>*!/*/}
                    {/*/!*    <p className="channelStatus">Disabled</p>*!/*/}
                    {/*/!*    <p className="totalMappedRooms">Mapped rooms</p>*!/*/}
                    {/*/!*    <button className="channelManageButton" onClick={() => setUserId()}>Manage</button>*!/*/}
                    {/*/!*    <button className="threeDotsButton" onClick={() => setUserId()}>*!/*/}
                    {/*/!*        <img src={three_dots} alt="Three Dots"/>*!/*/}
                    {/*/!*    </button>*!/*/}
                    {/*/!*</div>*!/*/}
                    {/*</div>*/}
                </div>
            </div>
        </div>
    );
}

export default HostDistribution;
