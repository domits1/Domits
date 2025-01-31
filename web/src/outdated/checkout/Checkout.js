import React from 'react';
import { useStripe, CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('YOUR_PUBLIC_STRIPE_KEY');

const CheckoutForm = () => {
    const stripe = useStripe();
  
    const handleSubmit = async (event) => {
      event.preventDefault();
  
      if (!stripe) {
        // Stripe.js has not yet loaded.
        return;
      }

      // Call your backend to create a Checkout Session
      const response = await fetch('/create-checkout-session', { method: 'POST' });
      const session = await response.json();

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        // Display error message
        console.log(result.error.message);
      }
    };
  
    return (
      <form onSubmit={handleSubmit}>
        <CardElement />
        <button type="submit" disabled={!stripe}>
          Pay
        </button>
      </form>
    );
};

const StripePaymentForm = () => (
  <Elements stripe={stripePromise}>
    <CheckoutForm />
  </Elements>
);

export default StripePaymentForm;