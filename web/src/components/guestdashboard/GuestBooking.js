import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import dateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";

import Pages from './Pages.js';
import './paymentsguestdashboard.css';

const BookingGuestDashboard = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [guestID, setGuestID] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

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
                    body: JSON.stringify({ GuestID: guestID })
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

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const filteredBookings = bookings.filter(booking => 
        filter === 'All' || booking.Status === filter
    );

    return (
        <div className="container">
            <h2>Booking</h2>
            <div className='dashboards'>
                <Pages />
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
                                            <td>{booking.Price}</td>
                                            <td>{booking.StartDate}</td>
                                            <td>{booking.EndDate}</td>
                                            <td>{dateFormatterDD_MM_YYYY(booking.createdAt)}</td>
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
};

export default BookingGuestDashboard;
