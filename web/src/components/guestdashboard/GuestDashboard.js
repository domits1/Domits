import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation, Auth } from "aws-amplify";
import Pages from "./Pages.js";

const GuestDashboard = () => {
    const [user, setUser] = useState({ email: '', name: '', address: '', phone: '', family: '' });
    const [editButton, setEditButton] = useState(false);

    const editClicked = (type) => {
        setEditButton(!editButton);
        if (type === 'email') {
            console.log("Email edit clicked. Email:", user.email);
            // swap the <p> tag with an input field
            // swap the edit icon with a save icon
            
        } else if (type === 'name') {
            console.log("Name edit clicked. Name:", user.name);
        }
    }

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
            const response = await API.graphql(graphqlOperation(listAccommodationsQuery));
            console.log("Accommodations:", response.data.listAccommodations.items);
        } catch (error) {
            console.error("Error listing accommodations:", error);
        }
    };

    useEffect(() => {
    }, [user.email]);

    return (
        <div className="container">
            <h2>Dashboard</h2>
            <div className="dashboards">
                <Pages />
                <div className="content">
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="infoBox">
                            <span>Email:</span>
                            <p>{user.email}</p>
                            <div onClick={() => editClicked('email')} className="edit-icon-background">
                                <img src={editIcon} alt="Email Icon" className="guest-edit-icon" />
                            </div>
                        </div>
                        <div className="infoBox">
                            <span>Name:</span>
                            <p>{user.name}</p>
                            <div onClick={() => editClicked('name')} className="edit-icon-background">
                                <img src={editIcon} alt="Name Icon" className="guest-edit-icon" />
                            </div>
                        </div>
                        <div className="infoBox">
                            <span>Address:</span>
                            <p>{user.address}</p>
                            <div className="edit-icon-background">
                                <img src={editIcon} alt="Address Icon" className="guest-edit-icon" />
                            </div>
                        </div>
                        <div className="infoBox">
                            <span>Phone:</span>
                            <p>{user.phone}</p>
                            <div className="edit-icon-background">
                                <img src={editIcon} alt="Phone Icon" className="guest-edit-icon" />
                            </div>
                        </div>
                        <div className="infoBox">
                            <span>Family:</span>
                            <p>{user.family}</p>
                            <div className="edit-icon-background">
                                <img src={editIcon} alt="Family Icon" className="guest-edit-icon" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestDashboard;
