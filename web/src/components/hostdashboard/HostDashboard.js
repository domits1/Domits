import React, { useState, useEffect } from 'react';
import Pages from "./Pages.js";
import './HostHomepage.css';
import './PagesDropdown.css';
import styles from './HostDashboard.module.css'
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
                    name: userInfo.attributes['given_name'],
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
                const response = await fetch('https://2b0ztg3dic.execute-api.eu-north-1.amazonaws.com/default/FetchRecentAccommodationss', {
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
        <main className="page-body">
            <StripeModal isOpen={isStripeModalOpen} onClose={() => setIsStripeModalOpen(false)}/>
            <div className={styles.dashboardHost}>
                <Pages/>
                <div>
                <div className={styles.dashboardContainer}>
                    <div className={styles.dashboardLeft}>
                        <h3 className={styles.welcomeMsg}>Welcome {user.name}</h3>
                        <div className={styles.dashboardHead}>
                            <div className={styles.buttonBox}>
                                <button className={styles.greenBtn} onClick={fetchRecentAccommodations}>Refresh
                                </button>
                                <button className={styles.greenBtn}
                                        onClick={() => navigate("/hostdashboard/listings")}>Go to
                                    listing
                                </button>
                                <button className={styles.greenBtn} onClick={() => navigate("/enlist")}>Add
                                    accommodation
                                </button>
                            </div>
                            <h3>My recent listings:</h3>
                        </div>
                        <div className={styles.infoBox}>
                            <img className={styles.infoIcon} src={info}/>
                            <p>Click on your listed accommodations to see their listing details</p>
                        </div>
                        {isLoading ? (
                            <div>
                                <img src={spinner} alt='spinner'/>
                            </div>
                        ) : accommodations.length > 0 ? (
                            accommodations.map((accommodation, index) => (
                                <div key={index} className={styles.dashboardCard}
                                     onClick={() => !accommodation.Drafted ? navigate(`/listingdetails?ID=${accommodation.ID}`) :
                                         alert('This accommodation is drafted and cannot be viewed in listing details!')
                                     }>
                                    <div className={styles.accommodationText}>
                                        <p className={styles.accommodationTitle}>{accommodation.Title}</p>
                                        {accommodation.AccommodationType === 'Boat' ? (
                                            <p className={styles.accommodationLocation}>
                                                {accommodation.City},
                                                {accommodation.Harbour}
                                            </p>
                                        ) : (
                                            <p className={styles.accommodationLocation}>
                                                {accommodation.City},
                                                {accommodation.Street},
                                                {accommodation.PostalCode}
                                            </p>
                                        )}
                                    </div>
                                    <ImageSlider images={accommodation.Images} seconds={5} page={'dashboard'}/>
                                    <div className={styles.accommodationDetails}>
                                        <p className={`${(accommodation.Drafted) ? styles.isDrafted : styles.isLive}`}
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
                            <div>
                                <p>It appears that you have not listed any
                                    accommodations recently...</p>
                            </div>
                        )}
                    </div>
                    <div className={styles.dashboardRight}>
                        <div className={styles.personalInfoContent}>
                            <h3>Personal Information</h3>
                            <div className={styles.personalInfoBox}><img src={editIcon}
                                                          alt="Email Icon"/><span>Email:</span> {user.email}</div>
                            <div className={styles.personalInfoBox}><img src={editIcon} alt="Name Icon"/><span>Name:</span> {user.name}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>

        </main>
    );
}


export default HostDashboard;
