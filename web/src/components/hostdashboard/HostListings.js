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
                // Extracting the response body
                const data = await response.json();
                // Now 'responseData' should contain your {statusCode, headers, body}
                // Check if 'responseData.body' exists and is a string
                if (data.body && typeof data.body === 'string') {
                    // Parse the JSON string inside 'responseData.body'
                    const accommodationsArray = JSON.parse(data.body);
                    // Ensure the parsed data is an array before setting the state
                    if (Array.isArray(accommodationsArray)) {
                        setAccommodations(accommodationsArray);
                    } else {
                        // Handle the case where the parsed data is not an array
                        console.error("Parsed data is not an array:", accommodationsArray);
                        setAccommodations([]); // Setting a default or handling as needed
                    }
                }
            } catch (error) {
                // Error Handling
                console.error("Unexpected error:", error);
            } finally {
                setIsLoading(false); // End loading regardless of promise outcome
            }
        }
    };
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
            <div className="dashboard">
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
                                <PageSwitcher accommodations={accommodations} amount={5} onDelete={asyncDeleteAccommodation}/>
                            ) : (
                                <div className="accommodation-box">
                                    <p className="accommodation-alert">It appears that you have not listed any accommodations yet...</p>
                                </div>
                            )}
                        </div>
                        <div className="box fullBox">
                            <p className="header">Pending</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}




export default HostListings;