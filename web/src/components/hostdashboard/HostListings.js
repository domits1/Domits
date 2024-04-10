import React, { useEffect, useState } from "react";
import Pages from "./Pages";
import './HostHomepage.css'
import add from "../../images/icons/host-add.png";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";

function HostListings() {
    const [accommodations, setAccommodations] = useState([]);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                await setUserId(userInfo.attributes.sub);
                console.log(userInfo);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };

        setUserIdAsync();
    }, []);

    useEffect(() => {
        const fetchAccommodations = async () => {
            if (!userId) {
                console.log("No user id")
                return;
            }

            const options = {
                OwnerId: userId
            };

            try {
                const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation', {
                    method: 'POST',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setAccommodations(data);
                console.log(data)
            } catch (error) {
                console.error(error);
            }
        };

        if (userId) {
            fetchAccommodations();
        }
    }, [userId]);


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
                            <p className="">Current listings</p>
                            {accommodations.length > 0 ? (
                                accommodations.map((accommodation, index) => (
                                    <div key={index} className="review-tab">
                                        Accommodation
                                    </div>
                                ))
                            ) : (
                                <div className="reviewBox">
                                    <p className="review-alert">It appears that you have not listed any accommodations yet...</p>
                                </div>
                            )}
                        </div>
                        <div className="box">
                            <p className="">Pending</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}




export default HostListings;