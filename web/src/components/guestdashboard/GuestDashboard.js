import React, { useEffect, useState } from "react";
import accommodationImg from "../../images/accommodationtestpic1.png";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation, Auth } from "aws-amplify";
import Pages from "./Pages.js";

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
        // Fetch data from API Gateway
        const response = await fetch('https://cfeo8gr5y0.execute-api.eu-north-1.amazonaws.com/dev/accommodation?PK=ACCOMMODATION%2328');
        const data = await response.json();
        console.log("Accommodations:", data);
    } catch (error) {
        console.error("Error listing accommodations:", error);
    }
};

const GuestDashboard = () => {
    const [user, setUser] = useState({ email: '', name: '', address: '', phone: '', family: '' });

    useEffect(() => {
        fetchAccommodations();
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            setUser({
                email: userInfo.attributes.email,
                name: userInfo.attributes['custom:username'],
                address: userInfo.attributes.address,
                phone: userInfo.attributes.phone_number,
                family: "2 adults - 2 kids" // needs to be calculated later on
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const navigate = useNavigate();

    return (
        <div className="guestdashboard">
            <div className="dashboard">
                <Pages />
                <div className="content">

                    <div className="leftContent">
                        <div className="bookingBox">
                            <h4>Current Booking</h4>
                            <p>Tropical 12 person villa with pool</p>
                            <img src={accommodationImg} alt="Booking" />
                            <p>Host: John Doe</p>
                        </div>
                        <div className="messageBoxes">
                            <h4>Messages (9+)</h4>
                            <p>Go to message centre</p>
                            <button>Go</button>
                        </div>
                    </div>
                    <div className="personalInfoContent">
                        <h4>Personal Information</h4>
                        <div className="infoBox"><img src={editIcon} alt="Email Icon" /><span>Email:</span> {user.email}</div>
                        <div className="infoBox"><img src={editIcon} alt="Name Icon" /><span>Name:</span> {user.name}</div>
                        <div className="infoBox"><img src={editIcon} alt="Address Icon" /><span>Address:</span> {user.address}</div>
                        <div className="infoBox"><img src={editIcon} alt="Phone Icon" /><span>Phone:</span> {user.phone}</div>
                        <div className="infoBox"><img src={editIcon} alt="Family Icon" /><span>Family:</span> {user.family}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestDashboard;
