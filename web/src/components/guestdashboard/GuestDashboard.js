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

const GuestDashboard = () => {
    const [user, setUser] = useState({ email: '', name: '', address: '', phone: '', family: '' });
    const [booking, setBooking] = useState(null);

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
                family: "2 adults - 2 kids"
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchAccommodations = async () => {
        try {
            const response = await fetch('https://j6jrtl31pj.execute-api.eu-north-1.amazonaws.com/dev/HostBookingTab?ID=ba854300-01d2-47a7-85f0-890af0ac35fe');
            const data = await response.json();
            if (data && data.length > 0) {
                const formattedBooking = formatData(data[0]);
                setBooking(formattedBooking);
            }
        } catch (error) {
            console.error("Error listing bookings:", error);
        }
    };

    const formatData = (item) => {
        return {
            image: item.Images.image1, // Use the image URLs from the Images object
            title: item.Title,
            details: item.Description, // Use the Description property
            id: item.ID,
        };
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
                            {booking ? (
                                <>
                                    <p>{booking.title}</p>
                                    <img src={booking.image} alt={booking.title} />
                                    <p>Host: {booking.host}</p>
                                </>
                            ) : (
                                <p>No current booking</p>
                            )}
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