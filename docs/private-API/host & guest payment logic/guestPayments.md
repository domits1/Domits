> # Guest Payments (Domits)
>
> **Code snippets do not match how the code is located in the project itself, but I have the indicated paths where the code can be located.**
> 
> ## Overview
> Payments on Domits are handled via **Stripe**. Guests complete checkout on a Stripe-hosted page; hosts receive payouts through Stripe Connect (documented separately in ["Host Finance"](hostFinance.md)).
> 
> - Stripe docs: https://docs.stripe.com/
> - Packages used:
>   - @stripe/react-stripe-js
>   - @stripe/stripe-js
> 
> ---
> 
> ## Payment Flow 
> 
> ### Web payments
> ![Web payments flow](https://github.com/user-attachments/assets/88f314cf-76a5-4a2b-9aeb-b046f029cd96)
> 
> ### Sequence: Guest -> Domits -> Host -> Payment Gateway -> Bank
> ![End-to-end payment sequence](https://github.com/user-attachments/assets/e5883665-d67e-4f07-bdfa-8357502de5bc)
> 
> ### API flow (server create flow)
> > How the server handles the create request for payments.
> ![Create request handling sequence](https://github.com/domits1/Domits/assets/108460857/c36e91bb-46d7-4ddf-81a4-215d3c6d3ce7)
> 
> ---
> 
> ## Payment Logic
> 
> ### Formula
> Current formula (subject to change) this must be implemented on the host side not the guest side and it must :
> ```
> total = roomRate * 1.15 + cleaning * nights
> ```
> - 1.10 represents a 10% commission (Domits).
> - **Note: Values may be adjusted; treat as configuration.**
> 
> ### Flow Description
> 1. Guest chooses an accommodation.
> 2. Front-end calculates prices and creates a checkout request. 
> 3. Back-end creates a Stripe Checkout Session (in the host's connected account).
> 4. Guest pays on Stripe's hosted page.
> 5. On success/cancel, Stripe redirects back to Domits with booking context and payment confirmation.
> 
> 
> File: `frontend/web/src/features/bookingengine/BookingConfirmOverview.js` and `C:\Domits\frontend\web\src\features\bookingengine\BookingOverview.js`
> 
> Initialize Stripe: `(C:\Domits\frontend\web\src\utils\const\publicKeys.json)` and ctrl + shift + f on loadStripe you will find where it is being useed
> ```js 
> const stripePromise = loadStripe('pk_live_51OAG6OGiInrsWMEcQy4ohaAZyT7tEMSEs23llcw2kr2XHdAWVcB6Tm8F71wsG8rB0AHgh4SJDkyBymhi82WABR6j00zJtMkpZ1');
> ```
> 
> Create checkout session and redirect: `frontend/web/src/features/bookingengine/BookingConfirmOverview.js` and `C:\Domits\frontend\web\src\outdated\checkout\CheckoutFrontEnd.js`
> ```js BookingConfirmOverview.js
> const initiateStripeCheckout = async () => {
>   if (!cognitoUserId || !ownerStripeId) {
>     setError('Cognito user ID or Owner Stripe ID is not available.');
>     return;
>   }
> 
>   const paymentID = generateUUID();
>   const basePrice = Math.round(accommodation.Rent * numberOfDays * 100); // cents
>   const totalAmount = Math.round(basePrice * 1.15 + cleaningFee);       // cents
> 
>   const successUrl = `${currentDomain}/bookingconfirmation?` + new URLSearchParams({
>     paymentID, accommodationTitle: accommodation.Title, userId: cognitoUserId,
>     accommodationId: id, ownerId: accommodation.OwnerId, State: "Accepted",
>     price: totalAmount / 100, startDate: checkIn, endDate: checkOut,
>   }).toString();
> 
>   const cancelUrl = `${currentDomain}/bookingconfirmation?` + new URLSearchParams({
>     paymentID, accommodationTitle: accommodation.Title, userId: cognitoUserId,
>     accommodationId: id, ownerId: accommodation.OwnerId, State: "Failed",
>     price: totalAmount / 100, startDate: checkIn, endDate: checkOut,
>   }).toString();
> 
>   const checkoutData = {
>     userId: cognitoUserId,
>     basePrice,
>     totalAmount,
>     currency: 'eur',
>     productName: accommodation.Title,
>     successUrl,
>     cancelUrl,
>     connectedAccountId: ownerStripeId,
>   };
> 
>   const response = await fetch('https://3zkmgnm6g6.execute-api.eu-north-1.amazonaws.com/dev/create-checkout-session', {
>     method: 'POST',
>     body: JSON.stringify(checkoutData),
>     headers: { 'Content-Type': 'application/json; charset=UTF-8' },
>   });
> 
>   const { sessionId } = await response.json();
>   const stripe = await stripePromise;
>   const { error } = await stripe.redirectToCheckout({ sessionId });
>   if (error) setError('Stripe Checkout error: ' + error.message);
> };
> ```
> 
> Key points
> - connectedAccountId is the host's Stripe account ID (from Stripe Connect).
> - Use redirectToCheckout with the session ID returned by the API response.
