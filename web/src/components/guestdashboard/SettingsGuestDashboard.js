import React, { useState } from 'react';
import './settingsguestdashboard.css';
import './guestdashboard.css';
import Pages from "./Pages.js";
import { useNavigate } from 'react-router-dom';
import faceHappyIcon from "../../images/icons/face-happy.png";
import settingsIcon from "../../images/icons/settings-04.png";
import { changeEmail, confirmEmailChange } from './emailSettings.js';

const SettingsTab = () => {
    const navigate = useNavigate();
    const [showMailSettings, setShowMailSettings] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerificationCodeInput, setShowVerificationCodeInput] = useState(false);

    const handleChangeEmail = async () => {
        if (newEmail !== confirmEmail) {
            // Handle email mismatch
            console.log("Emails do not match");
            return;
        }

        const { success, error } = await changeEmail(newEmail);
        if (success) {
            // Show input for verification code
            setShowVerificationCodeInput(true);
        } else {
            // Failed to change email, handle error
            console.error('Failed to change email:', error);
        }
    };

    const handleConfirmEmailChange = async () => {
        const { success, error } = await confirmEmailChange(verificationCode);
        if (success) {
            // Email change confirmed, update UI accordingly
            console.log('Email change confirmed');
            // Optionally, you can reset the input fields here
            setNewEmail('');
            setConfirmEmail('');
            setShowVerificationCodeInput(false);
        } else {
            // Failed to confirm email change, handle error
            console.error('Failed to confirm email change:', error);
        }
    };

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
                                </div>
                            )}
                            {/* End of mail settings dropdown */}

                            {showVerificationCodeInput && (
                                <div className="settingsOption">
                                    <input 
                                        type="text" 
                                        placeholder="Enter Verification Code" 
                                        value={verificationCode} 
                                        onChange={(e) => setVerificationCode(e.target.value)} 
                                    />
                                    <button onClick={handleConfirmEmailChange}>Confirm</button>
                                </div>
                            )}

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
