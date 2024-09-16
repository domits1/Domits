import React, { useState, useEffect } from 'react';
import Pages from "./Pages.js";
import './HostHomepage.css';
import './PagesDropdown.css'
import StripeModal from './StripeModal.js';
import { Auth } from 'aws-amplify';
import {useNavigate} from "react-router-dom";
import spinner from "../../images/spinnner.gif";
import info from "../../images/icons/info.png";
import ImageSlider from "../utils/ImageSlider";
import editIcon from "../../images/icons/edit-05.png";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";

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
        <main className="container">
            <StripeModal isOpen={isStripeModalOpen} onClose={() => setIsStripeModalOpen(false)}/>
            <div className="dashboard-header">
                <h2>Dashboard</h2>
                <h3 className="welcome-msg">Welcome {user.name}</h3>
            </div>
            <div className="dashboardHost">
                <Pages/>
                <div>
                <div className="contentContainer-dashboard">
                    <div className="dashboard-1">
                        <div className="dashboard-head">
                            <h3>My recent listings:</h3>
                            <button className="refresh-btn" onClick={fetchRecentAccommodations}>Refresh</button>
                            <button className="refresh-btn" onClick={() => navigate("/hostdashboard/listings")}>Go to
                                listing
                            </button>
                            <button className="refresh-btn" onClick={() => navigate("/enlist")}>Add accommodation</button>
                        </div>
                        <div className="listing-info">
                            <img className="info-icon" src={info}/>
                            <p className="info-msg">Click on your listed accommodations to see their listing details</p>
                        </div>
                        {isLoading ? (
                            <div>
                                <img src={spinner} alt='spinner'/>
                            </div>
                        ) : accommodations.length > 0 ? (
                            accommodations.map((accommodation, index) => (
                                <div key={index} className="dashboard-card"
                                     onClick={() => !accommodation.Drafted ? navigate(`/listingdetails?ID=${accommodation.ID}`) :
                                         alert('This accommodation is drafted and cannot be viewed in listing details!')
                                }>
                                    <div className="accommodation-text">
                                        <p className="accommodation-title">{accommodation.Title}</p>
                                        <p className="accommodation-location"> {accommodation.City},
                                            {accommodation.Street},
                                            {accommodation.PostalCode}
                                        </p>
                                    </div>
                                    <ImageSlider images={accommodation.Images} seconds={5}/>
                                    <div className="accommodation-details">
                                        <p className={accommodation.Drafted ? 'isDrafted' : 'isLive'}
                                        >Status: {accommodation.Drafted ? 'Drafted' : 'Live'}</p>
                                        <p>Listed on: {DateFormatterDD_MM_YYYY(accommodation.createdAt)}</p>
                                        {accommodation.DateRanges.length > 0 ?
                                            (<p>
                                                Available from
                                                {" " + DateFormatterDD_MM_YYYY(accommodation.DateRanges[0].startDate) + " "}
                                                to {" " +
                                                DateFormatterDD_MM_YYYY(accommodation.DateRanges[accommodation.DateRanges.length - 1].endDate) + " "}
                                            </p>) :
                                            (<p>Date range not set</p>)
                                        }
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="accommodation-box">
                                <p className="accommodation-alert">It appears that you have not listed any
                                    accommodations recently...</p>
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
            
        </main>
    );
}


export default HostDashboard;