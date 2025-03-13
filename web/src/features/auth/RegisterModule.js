import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import FlowContext from '../../services/FlowContext';
import './Register.css';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const RegisterModule = () => {
    const navigate = useNavigate();
    const { flowState, setFlowState } = useContext(FlowContext);

    const generateRandomUsername = () => {
        const chars = String.fromCharCode(...Array(127).keys()).slice(33);
        let result = '';
        for (let i = 0; i < 15; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        repeatPassword: '',
        username: generateRandomUsername(),
        firstName: '',
        lastName: '',
        phone: '',
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [signUpClicked, setSignUpClicked] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);
    const [passwordShake, setPasswordShake] = useState(false);
    const [requirements, setRequirements] = useState({
        length: false,
        uppercase: false,
        number: false,
        specialChar: false,
    });
    const [isPasswordStrong, setIsPasswordStrong] = useState(false);
    const passwordRef = useRef(null);
    const strengthBarRef = useRef(null);
    const strengthTextRef = useRef(null);
    const strengthContainerRef = useRef(null);

    const handleHostChange = (e) => {
        setFlowState(prevState => ({
            ...prevState,
            isHost: e.target.checked
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
        if (name === 'password') {
            checkPasswordStrength(value);
        }
    };

    const handleCountryCodeChange = (e) => {
        setFormData(prevState => ({
            ...prevState,
            countryCode: e.target.value,
        }));
    };

    const checkPasswordStrength = (password) => {
        let strength = 0;

        const newRequirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            specialChar: /[^A-Za-z0-9]/.test(password),
        };

        setRequirements(newRequirements);

        for (const key in newRequirements) {
            if (newRequirements[key]) strength++;
        }

        const strengthBar = strengthBarRef.current;
        const strengthText = strengthTextRef.current;

        if (strengthBar) {
            const strengthPercentage = (strength / 4) * 100;
            strengthBar.style.width = strengthPercentage + '%';

            if (strength < 2) {
                setColorAndText('red', 'Bad');
                setIsPasswordStrong(false);
            } else if (strength === 2) {
                setColorAndText('orange', 'Weak');
                setIsPasswordStrong(false);
            } else if (strength === 3) {
                setColorAndText('#088f08', 'Strong');
                setIsPasswordStrong(true);
            } else if (strength === 4) {
                setColorAndText('green', 'Very Strong');
                setIsPasswordStrong(true);
            }
        }

        if (strengthContainerRef.current) {
            strengthContainerRef.current.style.display = 'block';
        }
    };

    const setColorAndText = (color, text) => {
        const strengthBar = strengthBarRef.current;
        const strengthText = strengthTextRef.current;

        if (strengthBar) {
            strengthBar.style.backgroundColor = color;
        }
        if (strengthText) {
            strengthText.textContent = text;
            strengthText.style.color = color;
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const { username, email, password, firstName, lastName, phone, countryCode } = formData;

        if (!isPasswordStrong) {
            setErrorMessage("Password must be strong to submit.");
            setPasswordShake(true);
        }
        if (firstName.length < 1) {
            setErrorMessage('First name cannot be empty.');
            return;
        }
        if (lastName.length < 1) {
            setErrorMessage('Last name cannot be empty.');
            return;
        }
        if (phone.length < 1) {
            setErrorMessage('Phone number cannot be empty.');
            return;
        }
        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long.');
            setPasswordShake(true);
            return;
        }

        if (password.length > 64) {
            setErrorMessage('Password must be less than 64 characters.');
            setPasswordShake(true);
            return;
        }

        const hasUppercase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasUppercase && !hasNumber) {
            setErrorMessage('Password must contain at least one uppercase letter or one number.');
            setPasswordShake(true);
            return;
        }

        if (!email) {
            setErrorMessage('Email can\'t be empty!');
            return;
        }

        if (!password) {
            setErrorMessage('Password can\'t be empty!');
            return;
        }
        try {
            const emailName = email.split('@')[0];
            const groupName = flowState.isHost ? "Host" : "Traveler";
            await Auth.signUp({
                username: email,
                password,
                attributes: {
                    'custom:group': groupName,
                    'custom:username': emailName + username,
                    'given_name': firstName,
                    'family_name': lastName,
                    'phone_number': `${countryCode}${phone}`,
                },
            });
            navigate('/confirm-email', {
                state: { email, password }
            });
        } catch (error) {
            if (error.code === 'UsernameExistsException') {
                setErrorMessage('Email already exists!');
            } else {
                console.error("Error:", error);
                setErrorMessage('An unexpected error occurred');
            }
        }
    };

    const handleSignOut = async () => {
        try {
            await Auth.signOut();
            setIsAuthenticated(false);
            window.location.reload();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await Auth.currentAuthenticatedUser();
                setIsAuthenticated(true);
            } catch (error) {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!errorMessage.includes('Username')) {
                setShouldShake(false);
            }
            if (!errorMessage.includes('Password')) {
                setPasswordShake(false);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [errorMessage]);

    useEffect(() => {
        if (signUpClicked) {
            setSignUpClicked(false);
        }
    }, [signUpClicked]);

    return (
        <>
            {isAuthenticated ? (
                <div className='signOutDiv'>
                    <button className='signOutButton' onClick={handleSignOut}>Sign out</button>
                </div>
            ) : (
                <div className="registerContainer">
                    <div className="registerTitle">Create an account on Domits</div>
                    <form onSubmit={onSubmit} className="registerForm">
                        <label>First Name*</label>
                        <input
                            className="registerInput"
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                        />

                        <label>Last Name*</label>
                        <input
                            className="registerInput"
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                        />

                        <label>Email*</label>
                        <input
                            className="registerInput"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <label>Phone Number*</label>

                        <PhoneInput
                            country={'nl'}
                            value={formData.phone}
                            onChange={phone => setFormData(prevState => ({ ...prevState, phone }))}
                            inputClass="registerInput"
                            containerClass="phoneInputContainer"
                            inputStyle={{ width: '110%', border: '1px solid #999' }}
                        />

                        <label>Password*</label>
                        <div className="passwordContainer">
                            <input
                                id="password"
                                ref={passwordRef}
                                className={`registerInput ${errorMessage.includes('Password') ? 'inputError' : ''} ${passwordShake ? 'inputShake' : ''}`}
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => {
                                    if (strengthContainerRef.current) {
                                        strengthContainerRef.current.style.display = 'block';
                                    }
                                }}
                                style={{ borderColor: errorMessage.includes('Password') ? 'red' : 'var(--secondary-color)' }}
                            />
                        </div>
                        <div ref={strengthContainerRef} className="strength-container" style={{ display: 'none' }}>
                            <div id="strength-bar" ref={strengthBarRef}></div>
                            <div className="strength-text" ref={strengthTextRef}></div>
                            <div className="requirements">
                                <label>
                                    <input type="checkbox" checked={requirements.length} readOnly />
                                    At least 8 characters
                                </label>
                                <label>
                                    <input type="checkbox" checked={requirements.uppercase} readOnly />
                                    At least 1 uppercase letter
                                </label>
                                <label>
                                    <input type="checkbox" checked={requirements.number} readOnly />
                                    At least 1 number
                                </label>
                                <label>
                                    <input type="checkbox" checked={requirements.specialChar} readOnly />
                                    At least 1 special character
                                </label>
                            </div>
                        </div>
                        <label className="hostCheckbox">
                            <input
                                type="checkbox"
                                checked={flowState.isHost}
                                onChange={handleHostChange}
                            /> Become a Host
                        </label>
                        <div className="alreadyAccountText">
                            Already have an account? <a href="/web/src/features/auth/Login">Log in here</a>
                        </div>
                        {errorMessage && <div className="errorText">{errorMessage}</div>}
                        <button type="submit" className="registerButton" onClick={() => setShouldShake(true)}>Sign Up</button>
                    </form>
                </div>
            )}
        </>
    );
};

export default RegisterModule;