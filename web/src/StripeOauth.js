// src/StripeOAuth.js

import React from 'react';

const client_id = 'your_client_id';
const redirect_uri = 'http://localhost:3000/callback';

const StripeOAuth = () => {
    const handleConnect = () => {
        window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${client_id}&scope=read_write&redirect_uri=${redirect_uri}`;
    };

    return (
        <div>
            <button onClick={handleConnect}>Connect with Stripe</button>
        </div>
    );
};

export default StripeOAuth;
