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
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGuestBookings = async () => {
            try {
                const user = await Auth.currentAuthenticatedUser();
                const guestEmail = user.attributes.email;
                setGuestEmail(guestEmail);

                const response = await fetch(`/api/guest-bookings?email=${guestEmail}`);
                if (!response.ok) throw new Error('Failed to fetch bookings');

                const data = await response.json();
                setBookings(data);
                setGuestID(data.length > 0 ? data[0].GuestID : null);
            } catch (err) {
                console.error('Error fetching bookings:', err);
                setError('Could not load bookings. Please try again later.');
                // navigate('/login'); // Remove this line
            } finally {
                setLoading(false);
            }
        };

        fetchGuestBookings();
    }, [navigate]);

    const handleFilterChange = (e) => setFilter(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);
    const handleSortToggle = () => setSortAsc(prev => !prev);

    const filteredAndSortedBookings = bookings
        .filter(b => filter === 'All' || b.Status === filter)
        .filter(b => b.ListingName.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const dateA = new Date(a.StartDate);
            const dateB = new Date(b.StartDate);
            return sortAsc ? dateA - dateB : dateB - dateA;
        });

    const upcomingBookings = filteredAndSortedBookings.filter(b => new Date(b.EndDate) >= new Date());
    const pastBookings = filteredAndSortedBookings.filter(b => new Date(b.EndDate) < new Date());

    const renderBookingRow = (booking) => (
        <tr key={booking.BookingID} className={new Date(booking.StartDate) >= new Date() ? 'highlight-upcoming' : ''}>
            <td>{booking.ListingName}</td>
            <td>{dateFormatterDD_MM_YYYY(booking.StartDate)}</td>
            <td>{dateFormatterDD_MM_YYYY(booking.EndDate)}</td>
            <td><span className={`status-badge ${booking.Status.toLowerCase()}`}>{booking.Status}</span></td>
        </tr>
    );

    if (loading) return <div className="loading">Loading your bookings...</div>;

    return (
        <div className="guest-booking-page-body">
            <div className="guest-booking-dashboards">

                <h1>Welcome, {guestEmail}</h1>

                <div className="guest-booking-controls">
                    <select value={filter} onChange={handleFilterChange}>
                        <option value="All">All Statuses</option>
                        <option value="accepted">Accepted</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                    </select>

                    <input
                        type="text"
                        placeholder="Search by listing name"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />

                    <button onClick={handleSortToggle}>
                        Sort by Start Date {sortAsc ? '↑' : '↓'}
                    </button>

                    <button onClick={() => setBookingListPopup(prev => !prev)}>
                        {showBookingListPopup ? 'Hide Booking List' : 'Show Booking List'}
                    </button>
                </div>

                {showBookingListPopup && (
                    <div className="booking-list-popup">
                        <h3>All Filtered Bookings</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Listing</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedBookings.map(renderBookingRow)}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="guest-booking-bookingContent">
                    <h2>Upcoming & Active Bookings</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Listing</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {upcomingBookings.length > 0 ? upcomingBookings.map(renderBookingRow) : (
                                <tr><td colSpan="4">No upcoming bookings found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="previously-booked-container">
                    <h2>Previously Booked</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Listing</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pastBookings.length > 0 ? pastBookings.map(renderBookingRow) : (
                                <tr><td colSpan="4">No previous bookings found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default BookingGuestDashboard;
