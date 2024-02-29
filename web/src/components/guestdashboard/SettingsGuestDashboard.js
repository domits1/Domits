import React from 'react';
import './settingsguestdashboard.css';
import { useNavigate } from 'react-router-dom';
import faceHappyIcon from "../../images/icons/face-happy.png";
import messageIcon from "../../images/icons/message-chat-circle.png";
import paymentIcon from "../../images/icons/credit-card-check.png";
import starIcon from "../../images/icons/star-01.png";
import settingsIcon from "../../images/icons/settings-04.png";
import changeScreenIcon from "../../images/icons/Icon.png";

const SettingsTab = () => {
    const navigate = useNavigate();

    return (
        <div className="guestdashboard">
            <div className="sidebar">
                <div className="button" onClick={() => navigate("/guestdashboard")}>
                    <img src={faceHappyIcon} alt="Happy face Icon" className="icon" />
                    Profile
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/messages")}>
                    <img src={messageIcon} alt="Message Icon" className="icon" />
                    Message
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/payments")}>
                    <img src={paymentIcon} alt="Credit Card Icon" className="icon" />
                    Payments
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/reviews")}>
                    <img src={starIcon} alt="Star Icon" className="icon" />
                    Reviews
                </div>
                <div className="button" onClick={() => navigate("/guestdashboard/settings")}>
                    <img src={settingsIcon} alt="Settings Icon" className="icon" />
                    Settings
                </div>
                <div className="button last-button" onClick={() => { /* Implement navigation logic for Change Start screen when available */ }}>
                    <img src={changeScreenIcon} alt="Change Screen Icon" className="icon" />
                    Change Start screen
                </div>
            </div>
            <div className="content">
                <div className="settingsContent">
                    <h1>Lotte’s Settings</h1>
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
    );
};

export default SettingsTab;
