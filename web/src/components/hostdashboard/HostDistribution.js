import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import './HostDistribution.css';
import airbnb_logo from "../../images/icon-airbnb.png";
import three_dots from "../../images/three-dots-grid.svg";
// import arrow_left from "../../images/arrow-left-icon.svg";
// import arrow_right from "../../images/arrow-right-icon.svg";
import {Auth} from "aws-amplify";
import {formatDate, formatDescription, formatDateTime, formatLocation, downloadICal} from "../utils/iCalFormat.js";

// import DateFormatterYYYY_MM_DD from "../utils/DateFormatterYYYY_MM_DD";

function HostDistribution() {
    const [userId, setUserId] = useState(null);
    const [accommodations, setAccommodations] = useState([]);
    const [status, setStatus] = useState('Disabled');
    // const [booking, setBooking] = useState([]);
    const [iCalData, setICalData] = useState([]);


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
        const asyncRetrieveICalData = async () => {
            try {
                const response = await fetch('https://d6ia9ibn4e.execute-api.eu-north-1.amazonaws.com/default/retrieveICalData');

                const data = await response.json();
                console.log(data);

                if (data.body && typeof data.body === 'string') {
                    const retrievedICalData = data.response.Items;
                    console.log(retrievedICalData);

                    setICalData(retrievedICalData);
                }
            } catch (error) {
                console.error('Failed to fetch iCal data:', error);
            }
        };
        asyncRetrieveICalData();
    }, [accommodations]);

    // const handleRetrieveICalData = async () => {
    //     try {
    //         const response = await fetch('https://d6ia9ibn4e.execute-api.eu-north-1.amazonaws.com/default/retrieveICalData');
    //
    //         const data = await response.json();
    //         console.log(data);
    //
    //         if (data.body && typeof data.body === 'string') {
    //             const retrievedICalData = data.response.Items;
    //             console.log(retrievedICalData);
    //
    //             setICalData(retrievedICalData);
    //         }
    //     } catch (error) {
    //         console.error('Failed to fetch iCal data:', error);
    //     }
    // }

    const handleICal = async (e) => {
        e.preventDefault();

        let uid;
        let newStamp = new Date();
        let dtStart = new Date(iCalData[0].Dtstart.S);
        let dtEnd = new Date(iCalData[0].Dtend.S);
        let checkIn = new Date(iCalData[0].CheckIn.S);
        let checkOut = new Date(iCalData[0].CheckOut.S);
        let sequence = iCalData[0].Sequence.N;
        let guestId = iCalData[0].GuestId.S;

        if (uid === undefined || uid === null || uid === '') {
            const generateUUID = () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0,
                        v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
            uid = generateUUID();
        }

        if (guestId === undefined || guestId === null || guestId === '') {
            guestId = userId;
        }

        if (sequence === undefined || sequence === null || sequence === '') {
            sequence = 0;
        }

        if (iCalData[0].Dtstamp.S !== undefined || iCalData[0].Dtstamp.S !== null || iCalData[0].Dtstamp.S !== '') {
            newStamp = new Date(iCalData[0].Dtstamp.S);
        }

        if (iCalData && iCalData.length > 0) {
            const params = {
                id: uid,
                Dtstamp: formatDate(newStamp),
                Dtstart: formatDate(dtStart),
                Dtend: formatDate(dtEnd),
                Summary: accommodations[0].Title + ' - ' + iCalData[0].Status.S,
                Status: iCalData[0].Status.S,
                Description: formatDescription(accommodations[0].Description +
                    '\n\n' + 'Check-in: ' + formatDateTime(checkIn) +
                    '\n' + 'Check-out: ' + formatDateTime(checkOut)),
                CheckIn: formatDate(checkIn),
                CheckOut: formatDate(checkOut),
                BookingId: iCalData[0].BookingId.S,
                Location: {
                    Street: iCalData[0].Location.L[0].M.Street.S,
                    City: iCalData[0].Location.L[0].M.City.S,
                    Country: iCalData[0].Location.L[0].M.Country.S
                },
                Sequence: sequence,
                AccommodationId: accommodations[0].ID,
                LastModified: formatDate(new Date()),
                GuestId: guestId
            }

            console.log(params.Location.Street, " + " , params.Location.City, " + " , params.Location.Country);

            // const sampleEvent = {
            //     uid: uid,
            //     stamp: formatDate(newStamp),
            //     start: formatDate(dtStart),
            //     end: formatDate(dtEnd),
            //     summary: accommodations[0].Title + ' - ' + iCalData[0].Status.S,
            //     status: iCalData[0].Status.S,
            //     description: formatDescription(accommodations[0].Description +
            //         '\n\n' + 'Check-in: ' + formatDateTime(checkIn) +
            //         '\n' + 'Check-out: ' + formatDateTime(checkOut)),
            //     checkIn: formatDate(checkIn),
            //     checkOut: formatDate(checkOut),
            //     bookingId: iCalData[0].BookingId.S,
            //     location: formatLocation(iCalData[0].Location.L[0].M),
            //     sequence: sequence,
            //     accommodationId: accommodations[0].ID,
            //     lastModified: formatDate(new Date()),
            //     userId: guestId
            // }

            try {
                const response = await fetch('https://d6ia9ibn4e.execute-api.eu-north-1.amazonaws.com/default/iCalGenerator',
                    {
                        method: 'POST',
                        body: JSON.stringify(params),
                        headers: {
                            'Content-type': 'application/json; charset=UTF-8',
                        }
                    });
                console.log(response);
                const result = await response.json();
                console.log(result);

                if (result.statusCode === 200) {
                    alert('iCal data has been successfully POSTed');
                    downloadICal(params);
                }
            } catch (error) {
                console.error('Failed to POST iCal data:', error);
            }
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
                        <div className="host-dist-box-container" key={index}>
                            <div className="host-dist-box-row">
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
                    ))};
                </div>
            </div>
        </div>
    );
}

export default HostDistribution;
