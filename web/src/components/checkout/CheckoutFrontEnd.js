import React from 'react';
import {loadStripe} from '@stripe/stripe-js';
const stripePromise = loadStripe('pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4qL8dXvk00sxduWZd3');

function CheckoutFrontend() {
    const initiateStripeCheckout = async () => {
        const checkoutData = {
            amount: 1000, // Example: 2000 cents = $20
            currency: 'eur',
            productName: 'Example Product',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
            connectedAccountId: 'acct_1Oqu7a2fpL8pTlTk'
        };
    
        try {
            const response = await fetch('https://3zkmgnm6g6.execute-api.eu-north-1.amazonaws.com/dev/create-checkout-session', {
                method: 'POST',
                body: JSON.stringify(checkoutData),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            });
    
            const result = await response.json();
    
            if (response.ok) {
                const stripe = await stripePromise;
                const {error} = await stripe.redirectToCheckout({ sessionId: result.id });
                if (error) {
                    console.error('Stripe Checkout error:', error.message);
                }
            } else {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error initiating Stripe Checkout:', error);
        }
    };

    return (
        <button onClick={initiateStripeCheckout}>Test Payment</button>
    );
}

export default CheckoutFrontend;