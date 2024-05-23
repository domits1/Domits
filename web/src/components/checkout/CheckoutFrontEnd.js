import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Auth } from 'aws-amplify';

const stripePromise = loadStripe('pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4qL8dXvk00sxduWZd3');

function CheckoutFrontend() {
    const [cognitoUserId, setCognitoUserId] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setCognitoUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error fetching user info:", error);
            }
        };
    
        fetchUserInfo();
    }, []);
    
    const initiateStripeCheckout = async () => {
        if (!cognitoUserId) {
            console.error('Cognito user ID is not available.');
            return;
        }
    
        const checkoutData = {
            userId: cognitoUserId,
            amount: 50,  // example value in cents
            currency: 'eur',
            productName: 'EERSTE BETALING JONGENS',
            successUrl: 'https://domits.com/success',
            cancelUrl: 'https://domits.com/cancel',
            connectedAccountId: 'acct_1P15xO2enydXJo9e',
            client_reference_id: cognitoUserId  // Add this line
        };
    
        try {
            const response = await fetch('https://3zkmgnm6g6.execute-api.eu-north-1.amazonaws.com/dev/create-checkout-session', {
                method: 'POST',
                body: JSON.stringify(checkoutData),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const result = await response.json();
            const stripe = await stripePromise;
            const { error } = await stripe.redirectToCheckout({ sessionId: result.sessionId });
    
            if (error) {
                console.error('Stripe Checkout error:', error.message);
            }
        } catch (error) {
            console.error('Error initiating Stripe Checkout:', error);
        }
    };
    
    

    return (
        <button onClick={initiateStripeCheckout} disabled={!cognitoUserId}>Test Payment</button>
    );
}

export default CheckoutFrontend;