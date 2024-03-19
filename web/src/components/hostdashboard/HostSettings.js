import React from 'react';
import './settingshostdashboard.css';
import Pages from "./Pages";
import './HostHomepage.css'

import { useNavigate } from 'react-router-dom';
import faceHappyIcon from "../../images/icons/face-happy.png";
import settingsIcon from "../../images/icons/settings-04.png";


const HostSettings = () => {
    const navigate = useNavigate();

    return (
        <div className="container">
            <h2>Huub's Settings</h2>
            <div className='dashboards'>
                <Pages />
                <div className="content">
                    <div className="settingsContent">
                        <div className="settingsOptions">
                            <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Settings Icon" className="icon" />
                                Change mail settings and frequency
                            </div>
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

export default HostSettings;
