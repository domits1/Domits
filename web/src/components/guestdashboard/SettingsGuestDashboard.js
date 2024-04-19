import React from 'react';
import './settingsguestdashboard.css';

import './guestdashboard.css';
import Pages from "./Pages.js";

import { useNavigate } from 'react-router-dom';
import faceHappyIcon from "../../images/icons/face-happy.png";
import settingsIcon from "../../images/icons/settings-04.png";


const SettingsTab = () => {
    const navigate = useNavigate();

    return (
        <main className="guestdashboard">
            <section className='dashboards'>
                <Pages />
                <article className="content">
                    <article className="settingsContent">
                        <h1>Lotte’s Settings</h1>
                        <article className="settingsOptions">
                            <article className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Settings Icon" className="icon" />
                                Change mail settings and frequency
                            </article>
                            <article className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Globe Icon" className="icon" />
                                Change region and language
                            </article>
                            <article className="horizontalOptions">
                                <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                    <img src={settingsIcon} alt="Currency Icon" className="icon" />
                                    Change global currency
                                </div>
                                <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                    <img src={settingsIcon} alt="Profile Private Icon" className="icon" />
                                    Set profile to private
                                </div>
                            </article>
                            <div className="settingsOption" onClick={() => { /* Implement logic */ }}>
                                <img src={settingsIcon} alt="Helpdesk Icon" className="icon" />
                                Q&A Helpdesk
                            </div>
                        </article>
                        <article className="dataRemovalSection">
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
                        </article>
                    </article>
                    <article className="publicProfileContent">
                        <h2>Public profile</h2>
                        <div className="profileField">
                        </div>
                        <article className="profilePicture">
                            <img src={faceHappyIcon} alt="Profile" className="icon" />
                        </article>
                    </article>
                </article>
            </section>
        </main>
    );
};

export default SettingsTab;
