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
        const response = await API.graphql(graphqlOperation(listAccommodationsQuery));
        console.log("Accommodations:", response.data.listAccommodations.items);
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
            console.log(userInfo); // This should show the entire userInfo object
            console.log(userInfo.attributes); // This specifically shows the attributes
            // Assuming userInfo has the necessary details, adjust the keys based on your user data structure
            setUser({
                email: userInfo.attributes.email,
                // because it is a custom attribute it should be called like this
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
                            <h3>Current Booking</h3>
                            <p>Tropical 12 person villa with pool</p>
                            <img src={accommodationImg} alt="Booking" />
                            <p>Host: John Doe</p>
                        </div>
                        <div className="messageBoxes">
                            <h3>Messages (9+)</h3>
                            <p>Go to message centre</p>
                            <button>Go</button>
                        </div>
                    </div>
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="infoBox"><img src={editIcon} alt="Email Icon" /><span>Email:</span> {user.email}</div>
                        {/*custom attributes need to be called slightly different */}
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
