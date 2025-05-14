import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

const BookingGuestDashboard = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [guestID, setGuestID] = useState(null);
    const [guestEmail, setGuestEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [showBookingListPopup, setBookingListPopup] = useState(false);

    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setGuestID(userInfo.attributes.sub);
                setGuestEmail(userInfo.attributes.email);
            } catch (error) {
                console.error("Error setting user info:", error);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ GuestID: guestID })
            });
            if (!response.ok) throw new Error('Failed to fetch bookings');
            const data = await response.json();
            setBookings(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (guestID) fetchBookings();
    }, [guestID]);

    const handleFilterChange = (e) => setFilter(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);
    const toggleSortOrder = () => setSortAsc(!sortAsc);

    const filteredBookings = bookings
        .filter(booking => filter === 'All' || booking.Status === filter)
        .filter(booking => booking.Title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const dateA = new Date(a.StartDate);
            const dateB = new Date(b.StartDate);
            return sortAsc ? dateA - dateB : dateB - dateA;
        });

    const nextUpcomingBookingId = (() => {
        const future = bookings.filter(b => new Date(b.StartDate) > new Date());
        if (future.length === 0) return null;
        return future.sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate))[0].ID;
    })();

    const statusBadge = (status) => {
        const className = `status-badge ${status.toLowerCase()}`;
        return <span className={className}>{status}</span>;
    };

    const handleCancelation = async (booking) => {
        if (!window.confirm(`Are you sure you want to cancel the booking: ${booking.Title}?`)) return;

        const updatedBookings = bookings.map((b) =>
            b.ID === booking.ID ? { ...b, Status: 'Cancelled' } : b
        );
        setBookings(updatedBookings);

        try {
            const response = await fetch('https://5vyzv89320.execute-api.eu-north-1.amazonaws.com/default/Guest-Booking-Production-Update-CancelBooking', {
                method: 'PUT',
                body: JSON.stringify({ ID: booking.ID, status: 'Cancelled' }),
                headers: { 'Content-type': 'application/json; charset=UTF-8' },
            });

            if (!response.ok) throw new Error('Failed to cancel booking');
            await fetchBookings();
        } catch (error) {
            console.error('Error canceling booking:', error);
        }
    };

    const handleBookingListPopup = () => (
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
                        {bookings.filter(b => b.Status === 'Accepted').length === 0 ? (
                            <tr><td colSpan="5">No accepted bookings available.</td></tr>
                        ) : (
                            bookings.filter(b => b.Status === 'Accepted').map((b) => (
                                <tr key={b.ID}>
                                    <td>{b.Title}</td>
                                    <td>{dateFormatterDD_MM_YYYY(b.StartDate)}</td>
                                    <td>{dateFormatterDD_MM_YYYY(b.EndDate)}</td>
                                    <td>{dateFormatterDD_MM_YYYY(b.createdAt)}</td>
                                    <td>
                                        <button onClick={() => handleCancelation(b)}>X</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const handleClosePopUp = () => setBookingListPopup(false);

    return (
        <div className="guest-booking-page-body">
            <div className='guest-booking-dashboards'>
                <div className="guest-booking-bookingContent">
                    <div className="guest-booking-bookingContentHeader">
                        <div className="guest-booking-controls">
                            <label htmlFor="status-filter">Filter:</label>
                            <select id="status-filter" value={filter} onChange={handleFilterChange}>
                                <option value="All">All</option>
                                <option value="Accepted">Accepted</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Failed">Failed</option>
                                <option value="Pending">Pending</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search by title..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                            <button onClick={toggleSortOrder}>
                                Sort by Start Date {sortAsc ? '▲' : '▼'}
                            </button>
                            <button onClick={() => setBookingListPopup(true)}>Cancel Booking</button>
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
                                            <td colSpan="6">No bookings found. Try adjusting your filter or search.</td>
                                        </tr>
                                    ) : (
                                        filteredBookings.map((booking) => (
                                            <tr
                                                key={booking.ID}
                                                onClick={() => handleClick(booking.AccoID)}
                                                className={booking.ID === nextUpcomingBookingId ? 'highlight-upcoming' : ''}
                                            >
                                                <td>{booking.Title}</td>
                                                <td>{statusBadge(booking.Status)}</td>
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

                    {showBookingListPopup && handleBookingListPopup()}
                </div>
            </div>
        </div>
    );
};

export default BookingGuestDashboard;
