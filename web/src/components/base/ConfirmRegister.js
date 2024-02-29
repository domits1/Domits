import React, { FormEvent, useRef, useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import DigitInputs from '../ui/DigitsInputs/DigitsInputs';
import './ConfirmRegister.css'
import { loadStripe } from '@stripe/stripe-js';
import { API } from 'aws-amplify';

// Initialize stripe with your Stripe Publishable Key
const stripeClient = loadStripe(process.env.REACT_APP_PK);

function ConfirmEmail() {

    const [isConfirmed, setIsConfirmed] = useState(false)
    const [errorMessage, setErrorMessage] = useState('');

    const location = useLocation()
    const navigate = useNavigate()
    const inputRef = useRef([])

    const userEmail = location.state === null ? "" : location.state.email

    const isHost = location.state?.isHost;

    // async function createStripeAccount() {
    //     const response = await API.post('HostOnboardingAPI', '/create-stripe-account', {
    //         body: { isHost: true },
    //     });
    //     const { url } = await response.json();
    //     window.location.href = url; // Redirects user to Stripe for account completion
    // }

    async function createStripeAccount() {
        try {
            // Assuming you're using AWS Amplify API
            const apiName = 'HostOnboardingAPI'; // replace with your API Gateway API name
            const path = '/create-stripe-account'; // replace with your API Gateway path
            const response = await API.post(apiName, path, {});
            const data = await response.json();
            // Redirect to Stripe for account completion
            window.location.href = data.url;
        } catch (error) {
            console.error('Error creating Stripe account:', error);
        }
    }

    function onSubmit(e) {
        e.preventDefault()
        let code = ""
        inputRef.current.forEach((input) => { code += input.value })

        Auth.confirmSignUp(userEmail, code)
            .catch(error => {
                setErrorMessage('Invalid verification code, please check your email!');
            })
            .then(result => {
                if (result === 'SUCCESS') {
                    setIsConfirmed(true)
                    if (isHost) {
                        createStripeAccount();
                    }
                    setTimeout(() => navigate('/'), 3000)
                }
            })
    }

    const handleResendCode = () => {
        if (userEmail === '') {
            // Redirect to register page or any other desired route
            navigate('/register'); // Change '/register' to the desired route
        } else {
            // Resend code logic
            Auth.resendSignUp(userEmail);
        }
    };

    const form =
        <div className="confirmEmailContainer">
            <div className="confirmEmailTitle">Verify your registration</div>
            <form className="confirmEmailForm" onSubmit={onSubmit}>
                <div className="enter6DigitText">
                    Enter 6 digit code send to your email
                </div>
                <DigitInputs amount={6} inputRef={inputRef} className="confirmEmailDigitsInput" />
                {errorMessage && (
                    <div className="errorText">{errorMessage}</div>
                )}
                <button className="verifyRegisterButton" type="submit">Verify registration</button>
                <div className="notReceivedCodeText">
                    Not received a code? Check your spam folder or let us resend a code.
                </div>
                <button className="resendCodeButton" onClick={handleResendCode}>Resend code</button>
            </form>
        </div>

    const confirmedPopup =
        <div className="confirmemail-container">
            <p className="confirmemail-card_title">Succes!</p>
            <p className="confirmemail-card_text">Your email is now verified! You will be redirected shortly</p>
        </div>
    return (
        isConfirmed ?
            confirmedPopup : form

    )
}

export default ConfirmEmail