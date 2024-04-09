import React, { useState, useEffect } from 'react';
import Pages from "./Pages.js";
import './HostHomepage.css';
import StripeModal from './StripeModal.js';
import { Auth } from 'aws-amplify';

function HostDashboard() {
    const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);

    useEffect(() => {
        const checkStripeAccount = async () => {
            try {
                const userInfo = await Auth.currentAuthenticatedUser();
                const cognitoUserId = userInfo.attributes.sub;

                const response = await fetch(`https://fe3alokx8h.execute-api.eu-north-1.amazonaws.com/CheckIfStripeExists`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: cognitoUserId }),
                });
                const { hasStripeAccount } = await response.json();

                setIsStripeModalOpen(!hasStripeAccount);
            } catch (error) {
                console.error("Error fetching user's Stripe account status:", error);
            }
        };

        checkStripeAccount();
    }, []);

    return (
        <div className="container">
            <h2>Dashboard</h2>
            <StripeModal isOpen={isStripeModalOpen} onClose={() => setIsStripeModalOpen(false)} />
            <div className="dashboard">
                <Pages />

                <div className="contentContainer">
                    <div className="boxColumns">
                        <div className="box">
                            <p className="boxText">Dashboard</p>
                        </div>
                        <div className="box">
                            <p className="boxText">Pending guests</p>
                        </div>
                    </div>

                    <div className="boxColumns">
                        <div className="box">
                            <p className="boxText">Earnings</p>
                        </div>
                    </div>

                    <div className="boxColumns">
                        <div className="box">
                            <p className="boxText">Disputes</p>
                        </div>
                        <div className="box">
                            <p className="boxText">Recent reviews</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}




export default HostDashboard;