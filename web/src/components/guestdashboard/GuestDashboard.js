import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation, Auth } from "aws-amplify";
import Pages from "./Pages.js";

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
        <div className="page-body">
            <h2>Dashboard</h2>
            <div className="dashboards">
                <Pages />
                <div className="content">
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
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
