import React, { useRef, useState } from 'react';
import { Auth } from 'aws-amplify';
import DigitInputs from '../ui/DigitsInputs/DigitsInputs';
import './ForgotPassword.css';
import { useNavigate } from 'react-router-dom';

function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [resetRequested, setResetRequested] = useState(false);
    const [confirmationCode, setConfirmationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const inputRef = useRef([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        try {
            await Auth.forgotPassword(email);
            setResetRequested(true);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            if (newPassword !== confirmNewPassword) {
                throw new Error("Passwords do not match");
            }

            let code = "";
            inputRef.current.forEach((input) => {
                code += input.value;
            });

            await Auth.forgotPasswordSubmit(email, code, newPassword);
            // Set success message and resetRequested to false
            setSuccess(true);
            setResetRequested(false);
            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccess(false);
                navigate('/login');
            }, 3000);
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="forgotPasswordContainer">
            {success && <div className="successMessage">Password reset successful!</div>}
            <div className="forgotPasswordTitle">Forgot Password</div>
            <div className="forgotPasswordForm">
                {resetRequested ? (
                    <form onSubmit={handleResetPassword}>
                        <div className="forgotPasswordLabel fillInYourCodeLabel">Fill in your code</div>
                        <DigitInputs amount={6} inputRef={inputRef} className="forgotPasswordDigitInput" />
                        <div className="forgotPasswordLabel">New Password</div>
                        <input
                            required
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            className="forgotPasswordInput"
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <div className="forgotPasswordLabel">Confirm New Password</div>
                        <input
                            required
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmNewPassword}
                            className="forgotPasswordInput"
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                        <button type="submit" className="forgotPasswordButton">Reset Password</button>
                    </form>
                ) : (
                    <form onSubmit={handleEmailSubmit}>
                        <div className="forgotPasswordLabel">Email</div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            autoComplete={true}
                            className="forgotPasswordInput"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <div className="forgotPasswordText">Fill in your email to get a password reset code!</div>
                        <button type="submit" className="forgotPasswordButton">Send Reset Code</button>
                    </form>
                )}
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
        </div>
    );
}

export default ForgotPassword;
