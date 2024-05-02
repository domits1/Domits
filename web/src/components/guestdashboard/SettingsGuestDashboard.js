import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";
import Pages from "./Pages.js";

const SettingsTab = () => {
    const [user, setUser] = useState({ email: '', name: '', address: '', phone: '', family: '' });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            console.log(userInfo);
            console.log(userInfo.attributes); 
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

    const navigate = useNavigate();

    return (
        <div className="guestdashboard">
            <div className="dashboard">
                <Pages />
                <div className="content">
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="infoBox"><img src={editIcon} alt="Email Icon" /><span>Email:</span> {user.email}</div>
                        <div className="infoBox"><img src={editIcon} alt="Name Icon" /><span>Name:</span> {user.name}</div>
                        <div className="infoBox"><img src={editIcon} alt="Address Icon" /><span>Address:</span> {user.address}</div>
                        <div className="infoBox"><img src={editIcon} alt="Phone Icon" /><span>Phone:</span> {user.phone}</div>
                        <div className="infoBox"><img src={editIcon} alt="Family Icon" /><span>Family:</span> {user.family}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsTab;

// import React, { useState, useEffect } from 'react';
// import './settingsguestdashboard.css';
// import './guestdashboard.css';
// import Pages from "./Pages.js";
// import { Link, useNavigate } from 'react-router-dom';
// import faceHappyIcon from "../../images/icons/face-happy.png";
// import settingsIcon from "../../images/icons/settings-04.png";
// import { Auth } from 'aws-amplify';

// const SettingsTab = () => {
//     const navigate = useNavigate();
//     const [showMailSettings, setShowMailSettings] = useState(false);
//     const [newEmail, setNewEmail] = useState('');
//     const [confirmEmail, setConfirmEmail] = useState('');
//     const [verificationCode, setVerificationCode] = useState('');
//     const [showVerificationCodeInput, setShowVerificationCodeInput] = useState(false);
//     const [username, setUsername] = useState('');
//     const [newUsername, setNewUsername] = useState('');

//     useEffect(() => {
//         const fetchUserInfo = async () => {
//             try {
//                 const user = await Auth.currentAuthenticatedUser();
//                 setUsername(user.attributes['custom:username']);
//             } catch (error) {
//                 console.error('Error fetching user info:', error);
//             }
//         };

//         fetchUserInfo();
//     }, []);

//     const handleChangeEmail = async () => {
//         if (newEmail !== confirmEmail) {
//             console.log("Emails do not match");
//             return;
//         }

//         try {
//             const response = await fetch('https://z0j63xfxrb.execute-api.eu-north-1.amazonaws.com/dev/changeEmail', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ newEmail }),
//             });

//             if (response.ok) {
//                 setShowVerificationCodeInput(true);
//             } else {
//                 const data = await response.json();
//                 console.error('Failed to change email:', data.error);
//             }
//         } catch (error) {
//             console.error('Error changing email:', error);
//         }
//     };

//     const handleChangeUsername = async () => {
//         // Add validation for newUsername if needed

//         try {
//             // Assuming there's an API endpoint for changing username
//             const response = await fetch('YOUR_CHANGE_USERNAME_API_ENDPOINT', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ newUsername }),
//             });

//             if (response.ok) {
//                 setUsername(newUsername);
//                 console.log('Username changed successfully');
//             } else {
//                 const data = await response.json();
//                 console.error('Failed to change username:', data.error);
//             }
//         } catch (error) {
//             console.error('Error changing username:', error);
//         }
//     };

//     const handleConfirmEmailChange = async () => {
//         // Implement this function if needed
//     };

//     return (
//         <div className="guestdashboard">
//             <div className='dashboards'>
//                 <Pages />
//                 <div className="content">
//                     <div className="settingsContent">
//                         <h1>{username}'s Settings</h1>
//                         <div className="settingsOptions">
//                             <div className="settingsOption" onClick={() => setShowMailSettings(!showMailSettings)}>
//                                 <img src={settingsIcon} alt="Settings Icon" className="icon" />
//                                 Change mail settings and frequency
//                             </div>
//                             {showMailSettings && (
//                                 <div className="settingsOption">
//                                     <input
//                                         type="text"
//                                         placeholder="Enter new username"
//                                         value={newUsername}
//                                         onChange={(e) => setNewUsername(e.target.value)}
//                                     />
//                                     <button onClick={handleChangeUsername}>Change Username</button>
//                                     <input
//                                         type="text"
//                                         placeholder="Enter new email address"
//                                         value={newEmail}
//                                         onChange={(e) => setNewEmail(e.target.value)}
//                                     />
//                                     <input
//                                         type="text"
//                                         placeholder="Confirm new email address"
//                                         value={confirmEmail}
//                                         onChange={(e) => setConfirmEmail(e.target.value)}
//                                     />
//                                     <button onClick={handleChangeEmail}>Save</button>
//                                 </div>
//                             )}

//                             {showVerificationCodeInput && (
//                                 <div className="settingsOption">
//                                     <input
//                                         type="text"
//                                         placeholder="Enter Verification Code"
//                                         value={verificationCode}
//                                         onChange={(e) => setVerificationCode(e.target.value)}
//                                     />
//                                     <button onClick={handleConfirmEmailChange}>Confirm</button>
//                                 </div>
//                             )}

//                             <div className="settingsOption" onClick={() => { }}>
//                                 <img src={settingsIcon} alt="Globe Icon" className="icon" />
//                                 Change region and language
//                             </div>
//                             <div className="horizontalOptions">
//                                 <div className="settingsOption" onClick={() => { }}>
//                                     <img src={settingsIcon} alt="Currency Icon" className="icon" />
//                                     Change global currency
//                                 </div>
//                                 <div className="settingsOption" onClick={() => { }}>
//                                     <img src={settingsIcon} alt="Profile Private Icon" className="icon" />
//                                     Set profile to private
//                                 </div>
//                             </div>
//                             <Link to={`/helpdesk`}>
//                                 <div className="settingsOption">
//                                     <img src={settingsIcon} alt="Helpdesk Icon" className="icon" />
//                                     Q&A Helpdesk
//                                 </div>
//                             </Link>
//                         </div>
//                         <div className="dataRemovalSection">
//                             <h2>Remove your data</h2>
//                             <div className="dataRemovalOption" onClick={() => { }}>
//                                 <img src={settingsIcon} alt="Remove Reviews Icon" className="icon" />
//                                 Remove your reviews
//                             </div>
//                             <div className="dataRemovalOption" onClick={() => { }}>
//                                 <img src={settingsIcon} alt="Remove Search Icon" className="icon" />
//                                 Remove your search history
//                             </div>
//                             <div className="dataRemovalOption" onClick={() => { }}>
//                                 <img src={settingsIcon} alt="Delete Account Icon" className="icon" />
//                                 Request account deletion
//                             </div>
//                         </div>
//                     </div>
//                     <div className="publicProfileContent">
//                         <h2>Public profile</h2>
//                         <div className="profileField">
//                         </div>
//                         <div className="profilePicture">
//                             <img src={faceHappyIcon} alt="Profile" className="icon" />
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default SettingsTab;
