import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";
import { Auth } from "aws-amplify";
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

const GuestDashboard = () => {
    const [tempUser, setTempUser] = useState({ email: '', name: '' });
    const [user, setUser] = useState({ email: '', name: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [upcomingBookings, setUpcomingBookings] = useState([]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTempUser({ ...tempUser, [name]: value });
    };

    const toggleEditState = () => {
        setIsEditing((prev) => !prev);
        if (!isEditing) {
            setTempUser({ email: user.email, name: user.name });
        }
    };

    const fetchUserInfo = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            setUser({
                email: userInfo.attributes.email,
                name: userInfo.username,
            });
        } catch (error) {
            console.error("Error fetching user info:", error);
        }
    };

    const fetchUpcomingBookings = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            const guestID = userInfo.attributes.sub;

            const response = await fetch('https://j1ids2iygi.execute-api.eu-north-1.amazonaws.com/default/FetchGuestPayments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ GuestID: guestID }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const bookings = await response.json();
            const upcoming = bookings.filter(
                (booking) =>
                    booking.Status === 'Accepted' &&
                    new Date(booking.StartDate) > new Date()
            );

            setUpcomingBookings(upcoming);
        } catch (error) {
            console.error('Error fetching upcoming bookings:', error);
        }
    };

    useEffect(() => {
        fetchUserInfo();
        fetchUpcomingBookings();
    }, []);

    return (
        <div className="guest-dashboard-page-body">
            <h2>Dashboard</h2>
            <div className="guest-dashboard-dashboards">
                {/* Personal Information Card */}
                <div className="guest-dashboard-content">
                    <div className="guest-dashboard-personalInfoContent">
                        <div className="guest-dashboard-personal-info-header">
                            <h3>Personal Information</h3>
                            <div onClick={toggleEditState} className="guest-dashboard-edit-icon-background">
                                <img src={isEditing ? checkIcon : editIcon} alt="Edit" className="guest-dashboard-guest-edit-icon" />
                            </div>
                        </div>

                        <div className="guest-dashboard-infoBox">
                            <span>Email:</span>
                            {isEditing ? (
                                <input
                                    type="email"
                                    name="email"
                                    value={tempUser.email}
                                    onChange={handleInputChange}
                                    className="guest-dashboard-guest-edit-input"
                                />
                            ) : (
                                <p>{user.email}</p>
                            )}
                        </div>
                        <div className="guest-dashboard-infoBox">
                            <span>Name:</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={tempUser.name}
                                    onChange={handleInputChange}
                                    className="guest-dashboard-guest-edit-input"
                                />
                            ) : (
                                <p>{user.name}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Upcoming Bookings Card */}
                <div className="guest-dashboard-content">
                    <h3>Upcoming Bookings</h3>
                    {upcomingBookings.length === 0 ? (
                        <p>No upcoming bookings available.</p>
                    ) : (
                        <ul className="guest-dashboard-bookings-list">
                            {upcomingBookings.map((booking) => (
                                <li key={booking.ID} className="guest-dashboard-booking-item">
                                    <p><strong>{booking.Title}</strong></p>
                                    <p>Start: {dateFormatterDD_MM_YYYY(booking.StartDate)}</p>
                                    <p>End: {dateFormatterDD_MM_YYYY(booking.EndDate)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuestDashboard;