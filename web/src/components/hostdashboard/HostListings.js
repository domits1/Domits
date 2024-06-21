import React, { useEffect, useState } from "react";
import Pages from "./Pages";
import './HostHomepage.css'
import add from "../../images/icons/host-add.png";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import PageSwitcher from "../utils/PageSwitcher";

function HostListings() {
    const [accommodations, setAccommodations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [hasStripe, setHostStripe] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                await setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        setUserIdAsync();
    }, []);
    useEffect(() => {
        const checkHostStripeAcc = async (hostID) => {
            try {
                const response = await fetch(`https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: hostID }),
                });
                const data = await response.json();
                if (data.hasStripeAccount) {
                    setHostStripe(true);
                }
            } catch (error) {
                console.error("Error fetching user data or Stripe status:", error);
            }
        }
        checkHostStripeAcc(userId);
    }, [userId]);

    useEffect(() => {
        fetchAccommodations();
        if (userId) {
            fetchAccommodations().catch(console.error);
        }
    }, [userId]);
    const fetchAccommodations = async () => {
        setIsLoading(true);
        if (!userId) {
            console.log("No user id")
            return;
        } else {
            try {
                const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation', {
                    method: 'POST',
                    body: JSON.stringify({ OwnerId: userId }),
                    headers: {'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
                const data = await response.json();
                if (data.body && typeof data.body === 'string') {
                    const accommodationsArray = JSON.parse(data.body);
                    if (Array.isArray(accommodationsArray)) {
                        setAccommodations(accommodationsArray);
                    } else {
                        console.error("Parsed data is not an array:", accommodationsArray);
                        setAccommodations([]);
                    }
                }
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };
    const asyncChangeAccommodationStatus = async (id, drafted) => {
        let status = drafted ? 'Draft' : 'Live';
        if(confirm(`Do you wish to set this accommodation as ${status}?`) === true) {
            const options = {
                ID: id,
                Status: drafted
            };

            try {
                const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ChangeAccommodationStatues', {
                    method: 'PUT',
                    body: JSON.stringify(options),
                    headers: {'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    alert("Something went wrong, please try again later...")
                    throw new Error('Failed to fetch');
                }
                await fetchAccommodations();
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                alert("Update successful")
            }
        }
    }
    const asyncDeleteAccommodation = async (accommodation) => {
        if(confirm("Are you sure you want to remove this item from your listing?") === true) {
            let accId = accommodation.ID;
            let accImages = accommodation.Images;

            const options = {
                id: accId,
                images: accImages
            };
            setIsLoading(true);
            try {
                const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/DeleteAccommodation', {
                    method: 'DELETE',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                setAccommodations(prevAccommodations => prevAccommodations.filter(item => item.ID !== accId));
                alert('This item has been successfully removed from your listing!');
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
    }


    return (
        <div className="container">
            <h2>Listings</h2>
            <div className="dashboardHost">
                <Pages />
                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="wijzer addAcco" onClick={() => navigate("/enlist")} style={{maxWidth: 250,}}>
                            <img src={add} alt="add"></img>
                            <p>Add new accommodation</p>
                        </div>
                        <div className="box fullBox">
                            <p className="header">Current listings</p>
                            <button className="refresh-btn" onClick={fetchAccommodations}>Refresh</button>
                            {isLoading ? (
                                <div>
                                    <img src={spinner}/>
                                </div>
                            ) : accommodations.length > 0 ? (
                                <PageSwitcher accommodations={accommodations.filter(acco => acco.Drafted === false)}
                                              amount={3}
                                              hasStripe={hasStripe}
                                              onDelete={asyncDeleteAccommodation}
                                              onUpdate={asyncChangeAccommodationStatus}/>
                            ) : (
                                <div className="accommodation-box">
                                    <p className="accommodation-alert">It appears that you have not listed any accommodations yet...</p>
                                </div>
                            )}
                        </div>
                        <div className="box fullBox">
                            <p className="header">Drafted listings</p>
                            {isLoading ? (
                                <div>
                                    <img src={spinner}/>
                                </div>
                            ) : accommodations.length > 0 ? (
                                <PageSwitcher accommodations={accommodations.filter(acco => acco.Drafted === true)}
                                              amount={3}
                                              hasStripe={hasStripe}
                                              onDelete={asyncDeleteAccommodation}
                                              onUpdate={asyncChangeAccommodationStatus}/>
                            ) : (
                                <div className="accommodation-box">
                                    <p className="accommodation-alert">It appears that you have not drafted any accommodations yet...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}




export default HostListings;