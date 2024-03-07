import React, { FormEvent, useRef, useState, useContext } from 'react';
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import DigitInputs from '../ui/DigitsInputs/DigitsInputs';
import './ConfirmRegister.css';
import { useAuth } from './AuthContext'; // Import the AuthContext hook
import FlowContext from '../../FlowContext';

function ConfirmEmail() {
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const { credentials } = useAuth(); // Access credentials from AuthContext
    const location = useLocation();
    const navigate = useNavigate();
    const inputRef = useRef([]);
    const { flowState } = useContext(FlowContext);
    const { isHost } = flowState;

    const userEmail = location.state === null ? "" : location.state.email;
    const userPassword = credentials.password; // Access password from AuthContext

    async function createStripeAccount() {
        const options = {
            userEmail: userEmail
        };
        try {
            const result = await fetch('https://zuak8serw5.execute-api.eu-north-1.amazonaws.com/dev/CreateStripeAccount', {
                method: 'POST',
                body: JSON.stringify(options),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            });

            if (!result.ok) {
                throw new Error(`HTTP error! Status: ${result.status}`);
            }

            const data = await result.json();
            window.location.replace(data.url);
        } catch (error) {
            console.log(error);
        }
    }


    function onSubmit(e) {
        e.preventDefault();
        let code = "";
        inputRef.current.forEach((input) => { code += input.value });

        try {
            const result = await Auth.confirmSignUp(userEmail, code);
            if (result === 'SUCCESS') {
                setIsConfirmed(true);
                // Manually sign in the user after confirming their sign-up
                await Auth.signIn(userEmail, userPassword); // Sign in with email and password

                if (isHost) {
                    createStripeAccount();
                }
                // Redirect to home page ("/") after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            }
        } catch (error) {
            setErrorMessage('Invalid verification code, please check your email!');
            console.error('Error confirming sign up:', error);
        }
    }

    const handleResendCode = () => {
        if (userEmail === '') {
            navigate('/register');
        } else {
            Auth.resendSignUp(userEmail);
        }
    };

    const form = (
        <div className="confirmEmailContainer">
            <div className="confirmEmailTitle">Verify your registration</div>
            <form className="confirmEmailForm" onSubmit={onSubmit}>
                <div className="enter6DigitText">Enter 6 digit code sent to your email</div>
                <DigitInputs amount={6} inputRef={inputRef} className="confirmEmailDigitsInput" />
                {errorMessage && <div className="errorText">{errorMessage}</div>}
                <button className="verifyRegisterButton" type="submit">Verify registration</button>
                <div className="notReceivedCodeText">
                    Not received a code? Check your spam folder or let us resend a code.
                </div>
                <button className="resendCodeButton" onClick={handleResendCode}>Resend code</button>
            </form>
        </div>
    );

    const confirmedPopup = (
        <div className="confirmemail-container">
            <p className="confirmemail-card_title">Success!</p>
            <p className="confirmemail-card_text">Your email is now verified! You will be redirected shortly</p>
        </div>
    );

    return isConfirmed ? confirmedPopup : form;
}

export default ConfirmEmail;
