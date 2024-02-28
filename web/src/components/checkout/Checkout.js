import { useEffect, useState } from 'react';
import { stripeClient } from '../../index';
import { Auth } from 'aws-amplify';


const Checkout = () => {


    
}

// const PaymentLink = ({ subtotal }) => {
//     const [paymentLink, setPaymentLink] = useState('')
//     const [currentUser, setCurrentUser] = useState('')
//     const [userStripeAccountId, setUserStripeAccountId] = useState('')
//     const companyFee = subtotal * 0.15 // Domits takes 15% of the transaction.

//     useEffect(() => {
//         async function checkStripeAccountId() {
//             try {
//                 const user = await Auth.currentAuthenticatedUser();
//                 setCurrentUser(user);
//                 const stripeAccountId = user?.attributes['custom:stripeAccountId'] || '';
//                 setUserStripeAccountId(stripeAccountId);
//             } catch (error) {
//                 console.error('Error fetching authenticated user:', error);
//                 // Handle unauthenticated user scenario
//             }
//         }
//         checkStripeAccountId()
//     }, [])


// const createSession = async () => {
//     if (userStripeAccountId == '') return;

//     stripeClient.checkout.sessions.create({
//         currency: 'eur',
//         mode: 'payment',
//         customer_email: `${currentUser.attributes.email}`,
//         line_items: [{
//             price_data: {
//                 currency: 'eur',
//                 product_data: {
//                     name: "Betaling voor accommodatie",
//                 },
//                 unit_amount: subtotal
//             },
//             quantity: 1
//         }],
//         payment_method_types: ['card', 'ideal'],
//         payment_intent_data: {
//             application_fee_amount: Math.ceil(companyFee),
//             transfer_data: {
//                 destination: userStripeAccountId
//             }
//         },
//         success_url: `${window.location.origin}/payments/success`,
//         cancel_url: `${window.location.origin}/payments/canceled`,
//     }).then(result => setPaymentLink(result.url || ""))
// }

// return <>
//     <button onClick={createSession}>create payment</button>
//     <a href={paymentLink}>payment link</a>
// </>
// }

export default Checkout