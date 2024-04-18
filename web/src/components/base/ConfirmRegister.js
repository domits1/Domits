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

    const userEmail = location.state === null ? "" : location.state.email;
     
    function onSubmit(e) {
        e.preventDefault();
        let code = "";
        inputRef.current.forEach((input) => { code += input.value });

        Auth.confirmSignUp(userEmail, code)
            .then(result => {
                if (result === 'SUCCESS') {
                    setIsConfirmed(true);
                    if (isHost) {
                        navigate("/hostdashboard");
                    }
                    setTimeout(() => navigate('/'), 3000);
                }
            })
            .catch(error => {
                setErrorMessage('Invalid verification code, please check your email!');
            });
    }

    const handleResendCode = () => {
        if (userEmail === '') {
            navigate('/register');
        } else {
            Auth.resendSignUp(userEmail);
        }
    };

    const form = (
        <main className="confirmEmailContainer">
            <div className="confirmEmailTitle">Verify your registration</div> {/* Div met text? ik weet niet precies waar het voor gebruikt wordt dus deze moet nog aangepast worden */}
            <form className="confirmEmailForm" onSubmit={onSubmit}>
                <div className="enter6DigitText">
                    Enter 6 digit code sent to your email
                    {/* Div met text? ik weet niet precies waar het voor gebruikt wordt dus deze moet nog aangepast worden */}
                </div>
                <DigitInputs amount={6} inputRef={inputRef} />
                {errorMessage && (
                    <div className="errorText">{errorMessage}</div>
                )}
                <button className="verifyRegisterButton" type="submit">Verify registration</button>
                <div className="notReceivedCodeText">
                    Not received a code? Check your spam folder or let us resend a code.
                    {/* Div met text? ik weet niet precies waar het voor gebruikt wordt dus deze moet nog aangepast worden */}
                </div>
                
                <button className="resendCodeButton" onClick={handleResendCode}>Resend code</button>
            </form>
        </main>
    );

    const confirmedPopup = (
        <section className="confirmemail-container">
            <p className="confirmemail-card_title">Success!</p>
            <p className="confirmemail-card_text">Your email is now verified! You will be redirected shortly</p>
        </section>
    );

    return isConfirmed ? confirmedPopup : form;
}

export default ConfirmEmail;