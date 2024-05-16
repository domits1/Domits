import React, { useState, useEffect } from 'react';
import Pages from "./Pages.js";
import './HostHomepage.css';
import StripeModal from './StripeModal.js';
import { Auth } from 'aws-amplify';
import {useNavigate} from "react-router-dom";
import spinner from "../../images/spinnner.gif";
import ImageSlider from "../utils/ImageSlider";
import editIcon from "../../images/icons/edit-05.png";

function HostDashboard() {
    const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
    const [accommodations, setAccommodations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [user, setUser] = useState({ email: '', name: '', address: '', phone: '', family: '' });
    const navigate = useNavigate();
    useEffect(() => {
        const checkStripeAccount = async () => {
            try {
                const userInfo = await Auth.currentAuthenticatedUser();
                const cognitoUserId = userInfo.attributes.sub;

                const response = await fetch(`https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: cognitoUserId }),
                });
                const { hasStripeAccount } = await response.json();

                setIsStripeModalOpen(!hasStripeAccount);
            } catch (error) {
                console.error("Error fetching user's Stripe account status:", error);
            }
        };

        checkStripeAccount();
    }, []);
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    }
    useEffect(() => {
        const asyncConfigureUser = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                await setUserId(userInfo.attributes.sub);
                await setUser({
                    email: userInfo.attributes.email,
                    name: userInfo.attributes['custom:username'],
                    address: userInfo.attributes.address,
                    phone: userInfo.attributes.phone_number,
                    family: "2 adults - 2 kids"
                });
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        asyncConfigureUser();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchRecentAccommodations().catch(console.error);
        }
    }, [userId]);
    const fetchRecentAccommodations = async () => {
        setIsLoading(true);
        if (!userId) {
            console.log("No user id")
            return;
        } else {
            try {
                const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchRecentAccommodations', {
                    method: 'POST',
                    body: JSON.stringify({ OwnerId: userId }),
                    headers: {'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
                const data = await response.json();
                setAccommodations(JSON.parse(data.body));
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };
    return (
        <div className="container">
            <StripeModal isOpen={isStripeModalOpen} onClose={() => setIsStripeModalOpen(false)} />
            <h2>Dashboard</h2>
            <div className="dashboard">
                <Pages />
                <div className="contentContainer">
                    <div className="dashboard-1">
                        <div className="dashboard-head">
                            <h3>My recent listings:</h3>
                            <button className="refresh-btn" onClick={fetchRecentAccommodations}>Refresh</button>
                            <button className="refresh-btn" onClick={() => navigate("/hostdashboard/listings")}>Go to listing</button>
                        </div>
                        {isLoading ? (
                            <div>
                                <img src={spinner}/>
                            </div>
                        ) : accommodations.length > 0 ? (
                            accommodations.map((accommodation, index) => (
                                <div key={index} className="dashboard-card">
                                    <div className="accommodation-text">
                                        <p className="accommodation-title">{accommodation.Title}</p>
                                        <p className="accommodation-location"> {accommodation.City},
                                            {accommodation.Street},
                                            {accommodation.PostalCode}
                                        </p>
                                    </div>
                                    <ImageSlider images={accommodation.Images} seconds={5}/>
                                    <div className="accommodation-details">
                                        <p>Listed on: {formatDate(accommodation.createdAt)}</p>
                                        {accommodation.StartDate && accommodation.EndDate ?
                                            (<p>
                                                Available from
                                                {" " + formatDate(accommodation.StartDate) + " "}
                                                to {" " + formatDate(accommodation.EndDate) + " "}
                                            </p>) :
                                            (<p>Date range not set</p>)
                                        }
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="accommodation-box">
                                <p className="accommodation-alert">It appears that you have not listed any accommodations recently...</p>
                            </div>
                        )}
                    </div>
                    <div className="dashboard-2">
                        <div className="personalInfoContent">
                            <h3>Personal Information</h3>
                            <div className="infoBox"><img src={editIcon}
                                                          alt="Email Icon"/><span>Email:</span> {user.email}</div>
                            <div className="infoBox"><img src={editIcon} alt="Name Icon"/><span>Name:</span> {user.name}
                            </div>
                            <div className="infoBox"><img src={editIcon}
                                                          alt="Address Icon"/><span>Address:</span> {user.address}</div>
                            <div className="infoBox"><img src={editIcon}
                                                          alt="Phone Icon"/><span>Phone:</span> {user.phone}</div>
                            <div className="infoBox"><img src={editIcon}
                                                          alt="Family Icon"/><span>Family:</span> {user.family}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default HostDashboard;