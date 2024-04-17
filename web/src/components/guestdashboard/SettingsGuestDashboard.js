import React, { useState } from 'react';
import './settingsguestdashboard.css';
import './guestdashboard.css';
import Pages from "./Pages.js";
import { useNavigate } from 'react-router-dom';
import faceHappyIcon from "../../images/icons/face-happy.png";
import settingsIcon from "../../images/icons/settings-04.png";
import { Auth } from 'aws-amplify';

const SettingsTab = () => {
    const navigate = useNavigate();
    const [showMailSettings, setShowMailSettings] = useState(false);

    return (
        <div className="guestdashboard">
            <div className='dashboards'>
                <Pages />
                <div className="content">
                    <div className="settingsContent">
                        <h1>Lotte’s Settings</h1>
                        <div className="settingsOptions">
                            {/* Dropdown for mail settings */}
                            <div className="settingsOption" onClick={() => setShowMailSettings(!showMailSettings)}>
                                <img src={settingsIcon} alt="Settings Icon" className="icon" />
                                Change mail settings and frequency
                            </div>
                            {showMailSettings && (
                                <div className="settingsOption">
                                    <input type="text" placeholder="Enter new email address" />
                                    <input type="text" placeholder="Confirm new email address" />
                                    <button onClick={() => { /* Implement logic */ }}>Save</button>
                                </div>
                            )}
                            {/* End of mail settings dropdown */}

                            <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Globe Icon" className="icon" />
                                Change region and language
                            </div>
                            <div className="horizontalOptions">
                                <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                    <img src={settingsIcon} alt="Currency Icon" className="icon" />
                                    Change global currency
                                </div>
                                <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                    <img src={settingsIcon} alt="Profile Private Icon" className="icon" />
                                    Set profile to private
                                </div>
                            </div>
                            <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Helpdesk Icon" className="icon" />
                                Q&A Helpdesk
                            </div>
                        </div>
                        <div className="dataRemovalSection">
                            <h2>Remove your data</h2>
                            <div className="dataRemovalOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Remove Reviews Icon" className="icon" />
                                Remove your reviews
                            </div>
                            <div className="dataRemovalOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Remove Search Icon" className="icon" />
                                Remove your search history
                            </div>
                            <div className="dataRemovalOption" onClick={() => { /* Implement logic */ }}>
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
