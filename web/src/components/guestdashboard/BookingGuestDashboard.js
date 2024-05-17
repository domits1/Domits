import React from 'react';
import { useNavigate } from 'react-router-dom';

import './guestdashboard.css';
import Pages from "./Pages.js";
import './paymentsguestdashboard.css';

const BookingGuestDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="guestdashboard">
            <div className='dashboards'>
                <Pages />
                <div className="content">
                    <h1>The Booking page is still under construction</h1>
                </div>
            </div>
        </div>
    );
}

export default BookingGuestDashboard;
