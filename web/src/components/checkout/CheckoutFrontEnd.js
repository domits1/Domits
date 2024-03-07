// This function will be used once a database connection has been setup so that stripe account id's are saved and available to send to the backend code.
// The idea is to call this function when a user presses the pay button upon choosing an accommodation.
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_TEST_KEY);

async function initiateStripeCheckout() {
    const checkoutData = {
        amount: 2000, // Example: 2000 cents = $20
        currency: 'eur',
        productName: 'Example Product',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        connectedAccountId: 'acct_xxx', // The connected account ID, if applicable
    };

    try {
        const response = await fetch('/create-checkout-session', { // Make sure this endpoint matches your setup
            method: 'POST',
            body: JSON.stringify(checkoutData),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        });

        const result = await response.json();

        if (response.ok) {
            
            await stripe.redirectToCheckout({ sessionId: result.id });
        } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error initiating Stripe Checkout:', error);
    }
}