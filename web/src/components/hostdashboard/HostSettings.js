import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";
import Pages from "./Pages.js";


const HostSettings = () => {
    const [user, setUser] = useState({ email: '', name: '', address: '', phone: '', family: '' });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            console.log(userInfo); // This should show the entire userInfo object
            console.log(userInfo.attributes); // This specifically shows the attributes
            // Assuming userInfo has the necessary details, adjust the keys based on your user data structure
            setUser({
                email: userInfo.attributes.email,
                name: userInfo.attributes['given_name'],
                address: userInfo.attributes.address,
                phone: userInfo.attributes.phone_number,
                family: "2 adults - 2 kids" // needs to be calculated later on
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const navigate = useNavigate();

    return (
        <main className="page-body">
            <div className="dashboard">
                <Pages />
                <div className="content">
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="infoBox"><img src={editIcon} alt="Email Icon" /><span>Email:</span> {user.email}</div>
                        {/*custom attributes need to be called slightly different */}
                        <div className="infoBox"><img src={editIcon} alt="Name Icon" /><span>Name:</span> {user.name}</div>
                        <div className="infoBox"><img src={editIcon} alt="Address Icon" /><span>Address:</span> {user.address}</div>
                        <div className="infoBox"><img src={editIcon} alt="Phone Icon" /><span>Phone:</span> {user.phone}</div>
                        <div className="infoBox"><img src={editIcon} alt="Family Icon" /><span>Family:</span> {user.family}</div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default HostSettings;

// import React from 'react';
// import './settingshostdashboard.css';
// import Pages from "./Pages";
// import './HostHomepage.css'

// import { useNavigate } from 'react-router-dom';
// import faceHappyIcon from "../../images/icons/face-happy.png";
// import settingsIcon from "../../images/icons/settings-04.png";


// const HostSettings = () => {
//     const navigate = useNavigate();

//     return (
//         <div className="container">
//             <h2>Huub's Settings</h2>
//             <div className='dashboards'>
//                 <Pages />
//                 <div className="content">
//                     <div className="settingsContent">
//                         <div className="settingsOptions">
//                             <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
//                                 <img src={settingsIcon} alt="Settings Icon" className="icon" />
//                                 Change mail settings and frequency
//                             </div>
//                             <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
//                                 <img src={settingsIcon} alt="Globe Icon" className="icon" />
//                                 Change region and language
//                             </div>
//                             <div className="horizontalOptions">
//                                 <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
//                                     <img src={settingsIcon} alt="Currency Icon" className="icon" />
//                                     Change global currency
//                                 </div>
//                                 <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
//                                     <img src={settingsIcon} alt="Profile Private Icon" className="icon" />
//                                     Set profile to private
//                                 </div>
//                             </div>
//                             <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
//                                 <img src={settingsIcon} alt="Helpdesk Icon" className="icon" />
//                                 Q&A Helpdesk
//                             </div>
//                         </div>
//                         <div className="dataRemovalSection">
//                             <h2>Remove your data</h2>
//                             <div className="dataRemovalOption" onClick={() => { /* Implement logic */ }}>
//                                 <img src={settingsIcon} alt="Remove Reviews Icon" className="icon" />
//                                 Remove your reviews
//                             </div>
//                             <div className="dataRemovalOption" onClick={() => { /* Implement logic */ }}>
//                                 <img src={settingsIcon} alt="Remove Search Icon" className="icon" />
//                                 Remove your search history
//                             </div>
//                             <div className="dataRemovalOption" onClick={() => { /* Implement logic */ }}>
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

// export default HostSettings;
