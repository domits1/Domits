import React, { useState, useEffect } from 'react';
import './settingsguestdashboard.css';
import './guestdashboard.css';
import Pages from "./Pages.js";
import { Link, useNavigate } from 'react-router-dom';
import faceHappyIcon from "../../images/icons/face-happy.png";
import settingsIcon from "../../images/icons/settings-04.png";
import { Auth } from 'aws-amplify';

const SettingsTab = () => {
    const navigate = useNavigate();
    const [showMailSettings, setShowMailSettings] = useState(false);
    const [showPhotoSettings, setShowPhotoSettings] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerificationCodeInput, setShowVerificationCodeInput] = useState(false);
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState('');

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const user = await Auth.currentAuthenticatedUser();
                setUsername(user.attributes['custom:username']);
                setUserId(user.attributes.sub);
            } catch (error) {
                console.error('Error fetching user info:', error);
            }
        };

        fetchUserInfo();
    }, []);

    const handleChangeEmail = async () => {
        if (newEmail !== confirmEmail) {
            console.log("Emails do not match");
            return;
        }

        try {
            const response = await fetch('https://z0j63xfxrb.execute-api.eu-north-1.amazonaws.com/dev/changeEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newEmail, userId, username }),
            });

            console.log(response);

            if (response.ok) {
                setShowVerificationCodeInput(true);
            } else {
                const data = await response.json();
                console.error('Failed to change email:', data.error);
            }
        } catch (error) {
            console.error('Error changing email:', error);
        }
    };

    const handleConfirmEmailChange = async () => {
    };

    return (
        <div className="guestdashboard">
            <div className='dashboards'>
                <Pages />
                <div className="content">
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
};

export default SettingsTab;
