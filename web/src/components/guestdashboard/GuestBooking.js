import React, {useState, useEffect} from 'react';
import {Auth} from 'aws-amplify';
import {useNavigate} from 'react-router-dom';
import dateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";

import Pages from './Pages.js';
import './paymentsguestdashboard.css';
import {downloadICal, formatDate, formatDateTime, formatDescription} from "../utils/iCalFormat";

const BookingGuestDashboard = () => {
        const navigate = useNavigate();
        const [bookings, setBookings] = useState([]);
        const [guestID, setGuestID] = useState(null);
        const [loading, setLoading] = useState(true);
        const [filter, setFilter] = useState('All');
        const [accommodations, setAccommodations] = useState([]);
        const [iCalData, setICalData] = useState([]);

        useEffect(() => {
            const setUserIdAsync = async () => {
                try {
                    const userInfo = await Auth.currentUserInfo();
                    setGuestID(userInfo.attributes.sub);
                } catch (error) {
                    console.error("Error setting user id:", error);
                }
            };
            setUserIdAsync();
        }, []);

        const handleClick = (ID) => {
            navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
        };

        useEffect(() => {
            const fetchBookings = async () => {
                try {
                    const response = await fetch('https://j1ids2iygi.execute-api.eu-north-1.amazonaws.com/default/FetchGuestPayments', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({GuestID: guestID})
                    });
                    if (!response.ok) {
                        throw new Error('Failed to fetch bookings');
                    }
                    const data = await response.json();
                    setBookings(data);
                } catch (error) {
                    console.error('Error fetching bookings:', error);
                } finally {
                    setLoading(false);
                }
            };

            if (guestID) {
                fetchBookings();
            }
        }, [guestID]);

        useEffect(() => {
            const handleGetAccomodations = async () => {
                if (bookings.length === 0) return;

                else {
                    const findBookedAccos = bookings.map(booking => booking.AccoID && booking.Status === 'Accepted');
                    const getIndexOfBooking = findBookedAccos.findIndex(accoId => accoId !== false);
                    const accoIds = bookings[getIndexOfBooking].AccoID;

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
        }, [bookings]);

        useEffect(() => {
            if (!guestID) return;
            const asyncRetrieveICalData = async () => {
                try {
                    const response = await fetch('https://qtyvlto1ei.execute-api.eu-north-1.amazonaws.com/default/RetrieveICalDataByUser', {
                        method: 'POST',
                        body: JSON.stringify({GuestId: guestID}),
                        headers:
                            {
                                'Content-type': 'application/json; charset=UTF-8',
                            }
                    });
                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }

                    const data = await response.json();

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
        }, [guestID]);

        const fetchICalData = async (guestID) => {
            try {
                const response = await fetch('https://qtyvlto1ei.execute-api.eu-north-1.amazonaws.com/default/RetrieveICalDataByUser', {
                    method: 'POST',
                    body: JSON.stringify({GuestId: guestID}),
                    headers:
                        {
                            'Content-type': 'application/json; charset=UTF-8',
                        }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }

                const data = await response.json();

                if (data.body && typeof data.body === 'string') {
                    const retrievedICalData = data.body;
                    const parsedICalData = JSON.parse(retrievedICalData);
                    setICalData(parsedICalData);
                }
            } catch (error) {
                console.error('Failed to fetch iCal data:', error);
            }
        };

        const generateUUID = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        const handleICal = async (e, booking) => {
            e.preventDefault();
            e.stopPropagation();

            let targetBooking = booking;

            let uid;
            let newStamp;
            let dtStart;
            let dtEnd;
            let checkIn;
            let checkOut;
            let sequence;
            let iCalGuestId;
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
                dtStart = formatDate(new Date(targetBooking.StartDate));
                dtEnd = formatDate(new Date(targetBooking.EndDate));
                checkIn = formatDate(new Date(targetBooking.StartDate));
                checkOut = formatDate(new Date(targetBooking.EndDate));
                sequence = parseInt(iCalData[0].Sequence.N) + 1;
                iCalGuestId = iCalData[0].GuestId.S;
                accommodationId = iCalData[0].AccommodationId.S;
                bookingId = iCalData[0].BookingId.S;
                street = iCalData[0].Location.Street;
                city = iCalData[0].Location.City;
                country = iCalData[0].Location.Country;
                status = iCalData[0].Status.S;
                summary = iCalData[0].Summary.S;
                description = formatDescription(accommodations[0].Description.S +
                    '\n\n' + 'Check-in: ' + formatDateTime(checkIn) +
                    '\n' + 'Check-out: ' + formatDateTime(checkOut));
            } else {
                uid = generateUUID();
                iCalGuestId = guestID;
                sequence = 0;
                newStamp = formatDate(new Date());
                dtStart = formatDate(new Date(targetBooking.StartDate));
                dtEnd = formatDate(new Date(targetBooking.EndDate));
                checkIn = formatDate(new Date(targetBooking.StartDate));
                checkOut = formatDate(new Date(targetBooking.EndDate));
                accommodationId = accommodations[0].ID.S;
                bookingId = targetBooking.ID;
                street = accommodations[0].Street.S;
                city = accommodations[0].City.S;
                country = accommodations[0].Country.S;
                if (targetBooking.Status === 'Accepted') {
                    status = 'CONFIRMED';
                } else if (targetBooking.Status.S === 'FAILED') {
                    status = 'TENTATIVE';
                }
                summary = accommodations[0].Title.S + ' - ' + status;
                description = formatDescription(accommodations[0].Description.S +
                    '\n\n' + 'Check-in: ' + formatDateTime(checkIn) +
                    '\n' + 'Check-out: ' + formatDateTime(checkOut));
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
                GuestId: iCalGuestId
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
                    await fetchICalData(guestID);
                    downloadICal(params);
                }
            } catch (error) {
                console.error('Failed to POST iCal data:', error);
            }
        }

        const handleFilterChange = (event) => {
            setFilter(event.target.value);
        };

        const filteredBookings = bookings.filter(booking =>
            filter === 'All' || booking.Status === filter
        );

        return (
            <div className="page-body">
                <h2>Booking</h2>
                <div className='dashboards'>
                    <Pages/>
                    <div className="bookingContent">
                        <div className="filterContainer">
                            <label htmlFor="status-filter">Filter by status:</label>
                            <select id="status-filter" value={filter} onChange={handleFilterChange}>
                                <option value="All">All</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Failed">Failed</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <table className="bookings-table">
                                <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Status</th>
                                    <th>Price</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Created At</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan="6">No bookings available.</td>
                                    </tr>
                                ) : (
                                    filteredBookings.map(booking => (
                                        <tr onClick={() => handleClick(booking.AccoID)} key={booking.ID}>
                                            <td>{booking.Title}</td>
                                            <td>{booking.Status}</td>
                                            <td>&euro;{parseFloat(booking.Price).toFixed(2)}</td>
                                            <td>{dateFormatterDD_MM_YYYY(booking.StartDate)}</td>
                                            <td>{dateFormatterDD_MM_YYYY(booking.EndDate)}</td>
                                            <td>{dateFormatterDD_MM_YYYY(booking.createdAt)}</td>
                                            {booking.Status === "Accepted" && (
                                                <td>
                                                    <button className="exportToCalenderButton"
                                                            onClick={(e) => handleICal(e, booking)}>Export
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        );
    }
;

export default BookingGuestDashboard;