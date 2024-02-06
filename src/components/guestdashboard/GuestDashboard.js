import React from "react";
import accommodationImg from "../../images/accommodationtestpic1.png";
import faceHappyIcon from "../../images/icons/face-happy.png"
import './guestdashboard.css';
import paymentIcon from "../../images/icons/credit-card-check.png"
import settingsIcon from "../../images/icons/settings-04.png"
import starIcon from "../../images/icons/star-01.png"
import messageIcon from "../../images/icons/message-chat-circle.png"
import changeScreenIcon from "../../images/icons/Icon.png"
import editIcon from "../../images/icons/edit-05.png"
const GuestDashboard = () => {
    return (
        <div className="guestdashboard">

            <div className="sidebar">
                <div className="button">
                    <img src={faceHappyIcon} alt="Happy face Domits" className="icon" />
                    Profile
                </div>
                <div className="button">
                    <img src={messageIcon} alt="Message Domits" className="icon" />
                    Message
                </div>

                <div className="button">
                    <img src={paymentIcon} alt="Credit Card Domits" className="icon" />
                    Payments
                </div>
                <div className="button">
                    <img src={starIcon} alt="Star Domits" className="icon" />
                    Reviews
                </div>
                <div className="button">
                    <img src={settingsIcon} alt="Settings Domits" className="icon" />
                    Settings
                </div>
                <div className="button last-button">
                    <img src={changeScreenIcon} alt="Star Domits" className="icon" />
                    Change Start screen
                </div>
            </div>
            <div className="content">
                <div className="leftContent">
                    <div className="bookingBox">
                        <h3>Current Booking</h3>
                        <p>Tropical 12 person villa with pool</p>
                        <img src={accommodationImg} alt="Booking" />
                        <p>Host: John Doe</p>
                    </div>
                    <div className="messageBox">
                        <h3>Messages (9+)</h3>
                        <p>Go to message centre</p>
                        <button>Go</button>
                    </div>
                </div>
                <div className="personalInfoContent">
                    <h3>Personal Information</h3>
                    <div className="infoBox"><img src={editIcon} alt="Email Icon" /><span>Email:</span> Lotte_summer@gmail.com</div>
                    <div className="infoBox"><img src={editIcon} alt="Name Icon" /><span>Name:</span> Lotte Summer</div>
                    <div className="infoBox"><img src={editIcon} alt="Address Icon" /><span>Address:</span> Kinderhuissingel 6K, Haarlem</div>
                    <div className="infoBox"><img src={editIcon} alt="Phone Icon" /><span>Phone:</span> +31 6 09877890</div>
                    <div className="infoBox"><img src={editIcon} alt="Family Icon" /><span>Family:</span> 2 adults - 2 kids</div>
                </div>
            </div>
        </div>
    );
}

export default GuestDashboard;
