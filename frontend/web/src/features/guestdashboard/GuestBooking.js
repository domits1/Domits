import React, {useState, useEffect} from 'react';
import {Auth} from 'aws-amplify';
import {useNavigate} from 'react-router-dom';
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import Pages from './Pages.js';
import { getAccessToken } from "../../services/getAccessToken.js";

const BookingGuestDashboard = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [newBookings, setnewBookings] = useState([]);
    const [guestID, setGuestID] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [showBookingListPopup, setBookingListPopup] = useState(false);
    const authToken = getAccessToken();

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

    const fetchBookings = async () => {
        setLoading(true);
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
            console.log(data);
            console.log("Marijn", authToken);
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (guestID) {
            fetchBookings();
        }
    }, [guestID]);

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const filteredBookings = bookings.filter(booking =>
        filter === 'All' || booking.Status === filter
    );

    const toggleBookingList = () => {
        setBookingListPopup(!showBookingListPopup);
    };

    const handleClosePopUp = () => {
        setBookingListPopup(false);
    }

    const handleCancelation = async (booking) => {
        const updatedBookings = bookings.map((b) =>
            b.ID === booking.ID ? {...b, Status: 'Cancelled'} : b
        );
        setBookings(updatedBookings);

        try {
            const response = await fetch('https://5vyzv89320.execute-api.eu-north-1.amazonaws.com/default/Guest-Booking-Production-Update-CancelBooking', {
                method: 'PUT',
                body: JSON.stringify({
                    ID: booking.ID,
                    status: 'Cancelled',
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to cancel booking');
            }

            // Fetch the latest data from the server to ensure accuracy
            await fetchBookings();
        } catch (error) {
            console.error('Error canceling booking:', error);
        }
    };

    const handleBookingListPopup = () => {
        return (
            <div className="guest-booking-popup-overlay" onClick={handleClosePopUp}>
                <div className="guest-booking-popup-content" onClick={(e) => e.stopPropagation()}>
                    <h3>Cancelable Bookings</h3>
                    <table className="guest-booking-popup-bookings-table">
                        <thead>
                        <tr>
                            <th>Title</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Created At</th>
                            <th>Cancel</th>
                        </tr>
                        </thead>
                        <tbody>
                        {bookings.filter(booking => booking.Status === 'Accepted').length === 0 ? (
                            <tr>
                                <td colSpan="5">No accepted bookings available.</td>
                            </tr>
                        ) : (
                            bookings.filter(booking => booking.Status === 'Accepted').map((booking) => (
                                <tr key={booking.ID}>
                                    <td>{booking.Title}</td>
                                    <td>{dateFormatterDD_MM_YYYY(booking.StartDate)}</td>
                                    <td>{dateFormatterDD_MM_YYYY(booking.EndDate)}</td>
                                    <td>{dateFormatterDD_MM_YYYY(booking.createdAt)}</td>
                                    <td className="guest-booking-cancelButtonCell">
                                        <button
                                            className="guest-booking-cancelBookingButtonCell"
                                            onClick={() => handleCancelation(booking)}
                                        >
                                            X
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="guest-booking-page-body">
            <div className='guest-booking-dashboards'>
                <div className="guest-booking-bookingContent">
                    <div className="guest-booking-bookingContentHeader">
                        <div className="guest-booking-filterContainer">
                            <label htmlFor="status-filter">Filter by status:</label>
                            <select id="status-filter" value={filter} onChange={handleFilterChange}>
                                <option value="All">All</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Failed">Failed</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                        <div className="guest-booking-cancelBookingButton">
                            <button className="guest-booking-cancelBooking"
                                    onClick={toggleBookingList}
                            >Cancel Booking
                            </button>
                        </div>
                    </div>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <div className="guest-booking-table-wrapper">
                            <table className="guest-booking-bookings-table">
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
                                    filteredBookings.map((booking) => (
                                        <tr onClick={() => handleClick(booking.AccoID)} key={booking.ID}>
                                            <td>{booking.Title}</td>
                                            <td>{booking.Status}</td>
                                            <td>&euro;{parseFloat(booking.Price).toFixed(2)}</td>
                                            <td>{dateFormatterDD_MM_YYYY(booking.StartDate)}</td>
                                            <td>{dateFormatterDD_MM_YYYY(booking.EndDate)}</td>
                                            <td>{dateFormatterDD_MM_YYYY(booking.createdAt)}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {showBookingListPopup ? handleBookingListPopup() : null}
                </div>
            </div>
        </div>
    );
};

export default BookingGuestDashboard;