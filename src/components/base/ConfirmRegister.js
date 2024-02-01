import React, { FormEvent, useRef, useState } from 'react';
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import DigitInputs from '../ui/DigitsInputs/DigitsInputs';
import './ConfirmRegister.css'

function ConfirmEmail() {

    const [isConfirmed, setIsConfirmed] = useState(false)
    const [errorMessage, setErrorMessage] = useState('');

    const location = useLocation()
    const navigate = useNavigate()
    const inputRef = useRef([])

    const userEmail = location.state === null ? "" : location.state.email

    function onSubmit(e: FormEvent) {
        e.preventDefault()
        let code: string = ""
        inputRef.current.forEach((input: HTMLInputElement) => { code += input.value })

        Auth.confirmSignUp(userEmail, code)
            .catch(error => {
                setErrorMessage('Invalid verification code, please check your email!');
            })
            .then(result => { if (result === 'SUCCESS') {
                setIsConfirmed(true)
                setTimeout(() => navigate('/'), 3000)
            }})
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
                <DigitInputs amount={6} inputRef={inputRef} />
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