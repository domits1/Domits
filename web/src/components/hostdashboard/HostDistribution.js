import React, {useEffect, useState} from 'react';
import Pages from "./Pages.js";
import './HostDistribution.css';
import airbnb_logo from "../../images/icon-airbnb.png";
import three_dots from "../../images/three-dots-grid.svg";
import {Auth} from "aws-amplify";
import {formatDate, formatDescription, formatDateTime, downloadICal} from "../utils/iCalFormat.js";

function HostDistribution() {
    const [userId, setUserId] = useState(null);
    const [accommodations, setAccommodations] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [status, setStatus] = useState('Disabled');
    const [iCalData, setICalData] = useState([]);

    const [currentPannel, setCurrentPannel] = useState(1);
    const itemsPerPage = 5;
    const channelLength = 27;
    const channelPannel = (pannelNumber) => setCurrentPannel(pannelNumber);


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
        if (!userId) return;
            const asyncRetrieveBookingData = async () => {
                try {
                    const response = await fetch('https://fqujcw5loe.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingsDataByUserId', {
                        method: 'POST',
                        body: JSON.stringify({
                            GuestID: userId,
                            Status: 'Accepted'
                        }),
                        headers: {
                            'Content-type': 'application/json; charset=UTF-8',
                        }
                    });
                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }
                    const data = await response.json();

                    if (data.body && typeof data.body === 'string') {
                        const retrievedBookingDataArray = JSON.parse(data.body);

                        if (Array.isArray(retrievedBookingDataArray)) {
                            setBookings(retrievedBookingDataArray);
                        } else {
                            console.error('Retrieved data is not an array:', retrievedBookingDataArray);
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch booking data:', error);
                }
            }
            asyncRetrieveBookingData();
        }, [userId]
    );

    useEffect(() => {
        console.log('Bookings:', bookings);
    }, [bookings]);

    useEffect(() => {
            const handleGetAccomodations = async () => {
                if (bookings.length === 0) return;

                else {
                    const accoIds = bookings.map(booking => booking.AccoID);

                    try {
                        const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/getAccommodationByBooking', {
                            method: 'POST',
                            body: JSON.stringify({id: accoIds}),
                            headers: {
                                'Content-type': 'application/json; charset=UTF-8',
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
                            }
                        }
                    } catch (error) {
                        console.error('Failed to fetch accommodations:', error);
                    }
                }
            };

            handleGetAccomodations();
        }, [bookings]
    );

    useEffect(() => {
        console.log('Accommodations:', accommodations);
    }, [accommodations]);

    useEffect(() => {
        if (!userId) return;
        const asyncRetrieveICalData = async () => {
            console.log('User ID:', userId);
            try {
                const response = await fetch('https://qtyvlto1ei.execute-api.eu-north-1.amazonaws.com/default/RetrieveICalDataByUser', {
                    method: 'POST',
                    body: JSON.stringify({GuestId: userId}),
                    headers:
                        {
                            'Content-type': 'application/json; charset=UTF-8',
                        }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }

                const data = await response.json();
                console.log('Data:', data);

                if (data.body && typeof data.body === 'string') {
                    const retrievedICalData = data.body;
                    const parsedICalData = JSON.parse(retrievedICalData);
                    setICalData(parsedICalData);
                }
            } catch (error) {
                console.error('Failed to fetch iCal data:', error);
            }
        };
        asyncRetrieveICalData()
    }, [userId]);

    useEffect(() => {
        console.log('iCal Data:', iCalData);
    }, [iCalData]);

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const handleICal = async (e) => {
        console.log('iCal data:', iCalData);
        e.preventDefault();

        let uid;
        let newStamp;
        let dtStart;
        let dtEnd;
        let checkIn;
        let checkOut;
        let sequence;
        let guestId;
        let accommodationId;
        let bookingId;
        let street;
        let city;
        let country;
        let status;
        let summary;
        let description;

        if (iCalData !== undefined && iCalData.length > 0) {
            uid = iCalData[0].id.S;
            newStamp = new Date(iCalData[0].Dtstamp.S);
            dtStart = formatDate(new Date(bookings[0].StartDate.S));
            dtEnd = formatDate(new Date(bookings[0].EndDate.S));
            checkIn = formatDate(new Date(bookings[0].StartDate.S));
            checkOut = formatDate(new Date(bookings[0].EndDate.S));
            sequence = parseInt(iCalData[0].Sequence.N) + 1;
            guestId = iCalData[0].GuestId.S;
            accommodationId = iCalData[0].AccommodationId.S;
            bookingId = iCalData[0].BookingId.S;
            street = iCalData[0].Location.M.Street.S;
            city = iCalData[0].Location.M.City.S;
            country = iCalData[0].Location.M.Country.S;
            status = iCalData[0].Status.S;
            summary = iCalData[0].Summary.S;
            description = formatDescription(accommodations[0].Description.S +
                '\n\n' + 'Check-in: ' + formatDateTime(checkIn) +
                '\n' + 'Check-out: ' + formatDateTime(checkOut));
        } else {
            uid = generateUUID();
            guestId = userId;
            sequence = 0;
            newStamp = formatDate(new Date());
            dtStart = formatDate(new Date(bookings[0].StartDate.S));
            dtEnd = formatDate(new Date(bookings[0].EndDate.S));
            checkIn = formatDate(new Date(bookings[0].StartDate.S));
            checkOut = formatDate(new Date(bookings[0].EndDate.S));
            accommodationId = accommodations[0].ID.S;
            bookingId = bookings[0].ID.S;
            street = accommodations[0].Street.S;
            city = accommodations[0].City.S;
            country = accommodations[0].Country.S;
            if (bookings[0].Status.S === 'Accepted') {
                status = 'CONFIRMED';
            } else if (bookings[0].Status.S === 'FAILED') {
                status = 'TENTATIVE';
            }
            summary = accommodations[0].Title.S + ' - ' + status;
            description = formatDescription(accommodations[0].Description.S +
                '\n\n' + 'Check-in: ' + checkIn +
                '\n' + 'Check-out: ' + checkOut);
        }

        const params = {
            id: uid,
            Dtstamp: newStamp,
            Dtstart: dtStart,
            Dtend: dtEnd,
            Summary: summary,
            Status: status,
            Description: description,
            CheckIn: checkIn,
            CheckOut: checkOut,
            BookingId: bookingId,
            Location: {
                Street: street,
                City: city,
                Country: country
            },
            Sequence: sequence,
            AccommodationId: accommodationId,
            LastModified: formatDate(new Date()),
            GuestId: guestId
        }

        try {
            const response = await fetch('https://qtyvlto1ei.execute-api.eu-north-1.amazonaws.com/default/iCalGenerator',
                {
                    method: 'POST',
                    body: JSON.stringify(params),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });
            const result = await response.json();

            if (result.statusCode === 200) {
                alert('iCal data has been successfully POSTed');
                downloadICal(params);
            }
        } catch (error) {
            console.error('Failed to POST iCal data:', error);
        }
    }

    const handleEmptyButton = () => {
        alert("This button is not functional yet");
    }

    const handlePageRange = () => {
        const totalPages = Math.ceil(channelLength / itemsPerPage);
        let startPage = currentPannel - 2;

        if (startPage < 1) {
            startPage = 1;
        }

        let endPage = startPage + 4;
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(endPage - 4, 1);
        }

        return {startPage, endPage};
    };


    const {startPage, endPage} = handlePageRange();

    return (
        <div className="containerHostDistribution">
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
                <div className="channelContents">
                    <div className="contentContainer-channel">
                        {[...Array(channelLength)].slice((currentPannel - 1) * itemsPerPage, currentPannel * itemsPerPage)
                            .map((_, index) => (
                                <div className="host-dist-box-container" key={index}>
                                    <div className="host-dist-box-row">
                                        <img className="channelLogo" src={airbnb_logo} alt="Airbnb Logo"/>
                                        <p className="channelFont">Airbnb</p>
                                        <p className={`channelStatus ${status === 'Enabled' ? 'Enabled' : 'Disabled'}`}> {status} </p>
                                        <p className="totalMappedRooms">0 Mapped rooms</p>
                                        <button className="channelManageButton" onClick={handleEmptyButton}>Manage
                                        </button>
                                        <button className="threeDotsButton" onClick={handleEmptyButton}>
                                            <img src={three_dots} alt="Three Dots"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                    <div className="channelNavigation">
                        <button className="prevChannelButton"
                                onClick={() => channelPannel(currentPannel > 1 ? currentPannel - 1 : 1)}
                                disabled={currentPannel === 1}>
                            Previous
                        </button>
                        {[...Array(endPage - startPage + 1)].map((_, index) => {
                            const pageIndex = startPage + index;
                            return (
                                <button key={pageIndex}
                                        className={`channelPageButton ${currentPannel === pageIndex ? 'active' : ''}`}
                                        onClick={() => channelPannel(pageIndex)}>
                                    {pageIndex}
                                </button>
                            );
                        })}

                        <button className="nextChannelButton"
                                onClick={() => channelPannel(currentPannel < Math.ceil(channelLength / itemsPerPage) ? currentPannel + 1 : currentPannel)}
                                disabled={currentPannel === Math.ceil(channelLength / itemsPerPage)}>
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HostDistribution;
