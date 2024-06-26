import React, { FormEvent, useRef, useState, useContext } from 'react';
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import DigitInputs from '../ui/DigitsInputs/DigitsInputs';
import './ConfirmRegister.css';
import FlowContext from '../../FlowContext';

function ConfirmEmail() {
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const inputRef = useRef([]);
    const location = useLocation();
    const navigate = useNavigate();
    const { flowState } = useContext(FlowContext);
    const { isHost } = flowState;

    const userEmail = location.state?.email || "";
    const userPassword = location.state?.password || "";

    const onSubmit = (e) => {
        e.preventDefault();
        let code = "";
        inputRef.current.forEach((input) => { code += input.value });
    
        Auth.confirmSignUp(userEmail, code)
            .then(() => {
                return Auth.signIn(userEmail, userPassword);
            })
            .then(() => {
                setIsConfirmed(true);
                if (isHost) {
                    navigate("/hostdashboard");
                    window.location.reload();
                } else {
                    setTimeout(() => {
                        navigate('/');
                        window.location.reload();
                    }, 3000);
                }
            })
            .catch(error => {
                console.error('Error during confirmation or sign-in:', error);
                if (error.code === "NotAuthorizedException") {
                    setErrorMessage('Invalid verification code or your account may already be confirmed. Please try to log in.');
                } else {
                    setErrorMessage('Invalid verification code, please check your email!');
                }
            });
    };
    

    const handleResendCode = () => {
        if (userEmail === '') {
            navigate('/register');
        } else {
            Auth.resendSignUp(userEmail).catch(err => {
                console.error("Error resending code:", err);
                setErrorMessage("Failed to resend code, please try again later.");
            });
        }
    };

    const form = (
        <div className="confirmEmailContainer">
            <div className="confirmEmailTitle">Verify your registration</div>
            <form className="confirmEmailForm" onSubmit={onSubmit}>
                <div className="enter6DigitText">
                    Enter 6 digit code sent to your email
                </div>
                <DigitInputs amount={6} inputRef={inputRef} />
                {errorMessage && (
                    <div className="errorText">{errorMessage}</div>
                )}
                <button className="verifyRegisterButton" type="submit">Verify registration</button>
                <div className="notReceivedCodeText">
                    Not received a code? Check your spam folder or let us resend a code.
                </div>
                <button className="resendCodeButton" type="button" onClick={handleResendCode}>Resend code</button>
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
