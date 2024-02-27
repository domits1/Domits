import React, { useEffect } from "react";
import accommodationImg from "../../images/accommodationtestpic1.png";
import faceHappyIcon from "../../images/icons/face-happy.png";
import './guestdashboard.css';
import paymentIcon from "../../images/icons/credit-card-check.png";
import settingsIcon from "../../images/icons/settings-04.png";
import starIcon from "../../images/icons/star-01.png";
import messageIcon from "../../images/icons/message-chat-circle.png";
import changeScreenIcon from "../../images/icons/Icon.png";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation } from "aws-amplify";

const listAccommodationsQuery = `
query ListAccommodations {
  listAccommodations {
    items {
      id
      accommodation
      description
      createdAt
      updatedAt
    }
    nextToken
  }
}
`;

const fetchAccommodations = async () => {
    try {
        const response = await API.graphql(graphqlOperation(listAccommodationsQuery));
        console.log("Accommodations:", response.data.listAccommodations.items);
    } catch (error) {
        console.error("Error listing accommodations:", error);
    }
};

const GuestDashboard = () => {
    useEffect(() => {
        fetchAccommodations();
    }, []);
    const navigate = useNavigate();

    return (
        <div className="guestdashboard">
            <div className="sidebar">
                <div className="button" onClick={() => navigate("/guestdashboard")}>
                    <img src={faceHappyIcon} alt="Happy face Icon" className="icon" />
                    Profile
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/messages")}>
                    <img src={messageIcon} alt="Message Icon" className="icon" />
                    Message
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/payments")}>
                    <img src={paymentIcon} alt="Credit Card Icon" className="icon" />
                    Payments
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/reviews")}>
                    <img src={starIcon} alt="Star Icon" className="icon" />
                    Reviews
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/settings")}>
                    <img src={settingsIcon} alt="Settings Icon" className="icon" />
                    Settings
                </div>
                <div className="button last-button" onClick={() => { /* Implement navigation logic for Change Start screen when available */ }}>
                    <img src={changeScreenIcon} alt="Change Screen Icon" className="icon" />
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
