import React from "react";
import accommodationimg from "./accommodationtestpic1.png"

const GuestDashboard = () => {
    return ( 
        <div className="guestdashboard">
            <div className="toptext">
                <h1>Your bookings</h1>
                <h3 >Kinderhuissingel 6K - Haarlem</h3>
            </div>

            <div className="selects">
                <p>Previous bookings</p>
                <p>Current bookings</p>
                <p>New bookings</p>
                <p>+</p>
            </div>

            <div className="midtext">
                <div className="bookoverview">
                    <h2>Booking overview</h2>
                    <ul>
                        <li>Main booker</li>      <li id="details">Stefan Hopman</li>
                        <li>Amount of guests</li> <li id="details">2 adults - 2 kids</li>
                        <li>Email address</li>    <li id="details">info@financieelsysteem.nl</li>
                        <li>Phone number</li>     <li id="details">+31612345678</li>
                    </ul>
                    <br />
                    <div className="line"></div>
                    <div className="bookoverviewbold">
                        <p>Accommodation</p> 
                        <p>Kinderhuissingel 6K</p>                        
                    </div>
                    <div className="moreinfo">
                        <p>More information</p>
                    </div> 
                </div>
            
                <div className="pricedetails">
                    <h2>Price details</h2>
                    <ul>
                        <li>$140 night x 3</li>    <li id="details">$420,00</li>
                        <li>Cleaning fee  </li>    <li id="details">$50,00</li>
                        <li>Cat tax       </li>    <li id="details">$17,50</li>
                        <br/>
                        <li>Domits service fee</li><li id="details">$39,50</li>
                    </ul>
                    <div className="line"></div>
                    <div className="pricedetailsbold">
                        <p>Total (DOL)</p>
                        <p>$527,00</p>
                    </div>
                    <div className="moreinfo">
                        <p>More information</p>
                    </div> 
                </div>

                <div className="hostinfo">
                    <h3>Host: Stefan Hopman <h4>Contact host</h4></h3>
                    <img id="accoimg" src={accommodationimg} alt="Accommodation Test Pic 1" />
                </div>
                      </div>
            
            <div className="bottomtext">
                <h3>Change email</h3>
                <h3>Change phone number</h3>
                <h3>Download overview</h3>
                <h3>Download payment confirmation</h3>
            </div>
        </div>
     );
}
 
export default GuestDashboard;