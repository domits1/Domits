import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation, Auth } from "aws-amplify";
import Pages from "./Pages.js";

const GuestSettings = () => {
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
        <div className="container">
            <h2>Dashboard</h2>
            <div className="dashboard">
                <Pages />
                <div className="content flexwrap">
                    <div className="settingsContent">
                        <h1>{username}'s Settings</h1>
                        <div className="settingsOptions">
                            <div className="settingsOption" onClick={() => setShowMailSettings(!showMailSettings)}>
                                <img src={settingsIcon} alt="Settings Icon" className="icon" />
                                Change mail settings and frequency
                            </div>
                            {showMailSettings && (
                                <div className="settingsOption">
                                    <input
                                        type="text"
                                        placeholder="Enter new email address"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Confirm new email address"
                                        value={confirmEmail}
                                        onChange={(e) => setConfirmEmail(e.target.value)}
                                    />
                                    <button onClick={handleChangeEmail}>Save</button>
                                    <input
                                        type="text"
                                        placeholder="Enter Verification Code"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                    />
                                    <button onClick={handleConfirmEmailChange}>Confirm</button>
                                </div>
                            )}

                            <div className="settingsOption" onClick={() => { }}>
                                <img src={settingsIcon} alt="Globe Icon" className="icon" />
                                Change region and language
                            </div>
                            <div className="settingsOption" onClick={() => setShowPhotoSettings(!showPhotoSettings)}>
                                <img src={settingsIcon} alt="Globe Icon" className="icon" />
                                Change profile picture
                            </div>
                            {showPhotoSettings && (
                                <div className="settingsOption">
                                    <input
                                        type="file"
                                        placeholder="Please add your profile picture"
                                    />
                                </div>
                            )}
                            <div className="horizontalOptions">
                                <div className="settingsOption" onClick={() => { }}>
                                    <img src={settingsIcon} alt="Currency Icon" className="icon" />
                                    Change global currency
                                </div>
                                <div className="settingsOption" onClick={() => { }}>
                                    <img src={settingsIcon} alt="Profile Private Icon" className="icon" />
                                    Set profile to private
                                </div>
                            </div>
                            <Link to={`/helpdesk`}>
                                <div className="settingsOption">
                                    <img src={settingsIcon} alt="Helpdesk Icon" className="icon" />
                                    Q&A Helpdesk
                                </div>
                            </Link>
                        </div>
                        <div className="dataRemovalSection">
                            <h2>Remove your data</h2>
                            <div className="dataRemovalOption" onClick={() => { }}>
                                <img src={settingsIcon} alt="Remove Reviews Icon" className="icon" />
                                Remove your reviews
                            </div>
                            <div className="dataRemovalOption" onClick={() => { }}>
                                <img src={settingsIcon} alt="Remove Search Icon" className="icon" />
                                Remove your search history
                            </div>
                            <div className="dataRemovalOption" onClick={() => { }}>
                                <img src={settingsIcon} alt="Delete Account Icon" className="icon" />
                                Request account deletion
                            </div>
                        </div>
                    </div>
                    <div className="publicProfileContent">
                        <h2>Public profile</h2>
                        <div className="profileField">
                        </div>
                        <div className="profilePicture">
                            <img src={faceHappyIcon} alt="Profile" className="icon" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestSettings;
