import React from 'react';
import {loadStripe} from '@stripe/stripe-js';
const stripePromise = loadStripe('pk_live_51OAG6OGiInrsWMEcQy4ohaAZyT7tEMSEs23llcw2kr2XHdAWVcB6Tm8F71wsG8rB0AHgh4SJDkyBymhi82WABR6j00zJtMkpZ1');

function CheckoutFrontend() {
    const initiateStripeCheckout = async () => {
        const checkoutData = {
            amount: 50, // In centen
            currency: 'eur',
            productName: 'EERSTE BETALING JONGENS',
            successUrl: 'https://example.com/success',
            cancelUrl: 'https://example.com/cancel',
            connectedAccountId: 'acct_1P15xO2enydXJo9e'
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