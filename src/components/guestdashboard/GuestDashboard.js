import React from "react";

const GuestDashboard = () => {
    return ( 
        <div className="guestdashboard">
            <div className="bookoverview">
                <h2>Booking overview</h2>
                <ul>
                    <li>Main booker</li> 
                    <li>Amount of guests</li> 
                    <li>Email address</li> 
                    <li>Phone number</li> 
                </ul>
                <p id="ondertekst">Accommodation</p>
            </div>
            <div className="pricedetails">
                <h2>Price details</h2>
                <ul>
                    <li>$140 night x 3</li> 
                    <li>Cleaning fee</li>
                    <li>Cat tax</li> 
                </ul>
                <p id="ondertekst">Total (DOL)</p>
            </div>
        </div>
     );
}
 
export default GuestDashboard;