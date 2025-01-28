import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import FlowContext from '../../FlowContext';
import './Register.css';

const Register = () => {
    const navigate = useNavigate();
    const { flowState, setFlowState } = useContext(FlowContext)

    const generateRandomUsername = () => {
        const chars = String.fromCharCode(...Array(127).keys()).slice(33);
        let result = '';
        for (let i = 0; i < 15; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const [formData, setFormData] = useState({
        // prefferedName: '', // do not remove this yet it might become usefull later if you have questions: ask Chant
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
    const strengthContainerRef = useRef(null); // Declare the strengthContainerRef

    const countryCodes = [
        { code: "+1", name: "United States/Canada" },
        { code: "+7", name: "Russia" },
        { code: "+20", name: "Egypt" },
        { code: "+27", name: "South Africa" },
        { code: "+30", name: "Greece" },
        { code: "+31", name: "Netherlands" },
        { code: "+32", name: "Belgium" },
        { code: "+33", name: "France" },
        { code: "+34", name: "Spain" },
        { code: "+36", name: "Hungary" },
        { code: "+39", name: "Italy" },
        { code: "+40", name: "Romania" },
        { code: "+44", name: "United Kingdom" },
        { code: "+45", name: "Denmark" },
        { code: "+46", name: "Sweden" },
        { code: "+47", name: "Norway" },
        { code: "+48", name: "Poland" },
        { code: "+49", name: "Germany" },
        { code: "+52", name: "Mexico" },
        { code: "+54", name: "Argentina" },
        { code: "+55", name: "Brazil" },
        { code: "+56", name: "Chile" },
        { code: "+57", name: "Colombia" },
        { code: "+58", name: "Venezuela" },
        { code: "+60", name: "Malaysia" },
        { code: "+61", name: "Australia" },
        { code: "+62", name: "Indonesia" },
        { code: "+63", name: "Philippines" },
        { code: "+64", name: "New Zealand" },
        { code: "+65", name: "Singapore" },
        { code: "+66", name: "Thailand" },
        { code: "+81", name: "Japan" },
        { code: "+82", name: "South Korea" },
        { code: "+84", name: "Vietnam" },
        { code: "+86", name: "China" },
        { code: "+90", name: "Turkey" },
        { code: "+91", name: "India" },
        { code: "+92", name: "Pakistan" },
        { code: "+93", name: "Afghanistan" },
        { code: "+94", name: "Sri Lanka" },
        { code: "+95", name: "Myanmar" },
        { code: "+98", name: "Iran" },
        { code: "+212", name: "Morocco" },
        { code: "+213", name: "Algeria" },
        { code: "+216", name: "Tunisia" },
        { code: "+218", name: "Libya" },
        { code: "+220", name: "Gambia" },
        { code: "+221", name: "Senegal" },
        { code: "+223", name: "Mali" },
        { code: "+225", name: "Ivory Coast" },
        { code: "+230", name: "Mauritius" },
        { code: "+234", name: "Nigeria" },
        { code: "+254", name: "Kenya" },
        { code: "+255", name: "Tanzania" },
        { code: "+256", name: "Uganda" },
        { code: "+260", name: "Zambia" },
        { code: "+263", name: "Zimbabwe" },
        { code: "+267", name: "Botswana" },
        { code: "+356", name: "Malta" },
        { code: "+358", name: "Finland" },
        { code: "+359", name: "Bulgaria" },
        { code: "+370", name: "Lithuania" },
        { code: "+371", name: "Latvia" },
        { code: "+372", name: "Estonia" },
        { code: "+373", name: "Moldova" },
        { code: "+374", name: "Armenia" },
        { code: "+375", name: "Belarus" },
        { code: "+376", name: "Andorra" },
        { code: "+380", name: "Ukraine" },
        { code: "+381", name: "Serbia" },
        { code: "+385", name: "Croatia" },
        { code: "+386", name: "Slovenia" },
        { code: "+387", name: "Bosnia and Herzegovina" },
        { code: "+389", name: "North Macedonia" },
        { code: "+420", name: "Czech Republic" },
        { code: "+421", name: "Slovakia" },
        { code: "+423", name: "Liechtenstein" },
        { code: "+500", name: "Falkland Islands" },
        { code: "+501", name: "Belize" },
        { code: "+502", name: "Guatemala" },
        { code: "+503", name: "El Salvador" },
        { code: "+504", name: "Honduras" },
        { code: "+505", name: "Nicaragua" },
        { code: "+506", name: "Costa Rica" },
        { code: "+507", name: "Panama" },
        { code: "+509", name: "Haiti" },
        { code: "+852", name: "Hong Kong" },
        { code: "+853", name: "Macau" },
        { code: "+855", name: "Cambodia" },
        { code: "+856", name: "Laos" },
        { code: "+880", name: "Bangladesh" },
        { code: "+960", name: "Maldives" },
        { code: "+961", name: "Lebanon" },
        { code: "+962", name: "Jordan" },
        { code: "+963", name: "Syria" },
        { code: "+964", name: "Iraq" },
        { code: "+965", name: "Kuwait" },
        { code: "+966", name: "Saudi Arabia" },
        { code: "+967", name: "Yemen" },
        { code: "+971", name: "United Arab Emirates" },
        { code: "+972", name: "Israel" },
        { code: "+973", name: "Bahrain" },
        { code: "+974", name: "Qatar" },
        { code: "+975", name: "Bhutan" },
        { code: "+976", name: "Mongolia" },
        { code: "+977", name: "Nepal" },
        { code: "+992", name: "Tajikistan" },
        { code: "+993", name: "Turkmenistan" },
        { code: "+994", name: "Azerbaijan" },
        { code: "+995", name: "Georgia" },
        { code: "+996", name: "Kyrgyzstan" },
        { code: "+998", name: "Uzbekistan" },
    ];

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
            const strengthPercentage = (strength / 4) * 100; // Calculate percentage based on 4 criteria
            strengthBar.style.width = strengthPercentage + '%';

            // Update password strength based on the number of requirements met
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

        // Show the strength container when typing the password
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

    // do not remove this yet it might become usefull later if you have questions: ask Chant
    // const isPreferredNameUnique = async (prefferedName) => {
    //     try {
    //         const result = await Auth.adminListUsers({
    //             UserPoolId: 'eu-north-1:6776b3c3-e6ff-4025-9651-4ad94e7eb98e', // replace with your User Pool ID
    //             Filter: `preferred_username = \"${prefferedName}\"`,
    //         });
    //         return result.Users.length === 0; // If no user is found, the name is unique
    //     } catch (error) {
    //         console.error('Error fetching users:', error);
    //         return false;
    //     }
    // };

    const onSubmit = async (e) => {
        e.preventDefault();
        const { username, email, password, firstName, lastName , phone, countryCode } = formData;

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
            // do not remove this yet it might become usefull later if you have questions: ask Chant
            // const isUnique = await isPreferredNameUnique(prefferedName);
            // if (!isUnique) {
            //     setErrorMessage('Preferred name already exists!');
            //     return;
            // }

            const emailName = email.split('@')[0];
            const groupName = flowState.isHost ? "Host" : "Traveler";
            await Auth.signUp({
                username: email,
                password,
                attributes: {
                    'custom:group': groupName,
                    'custom:username': emailName + username,
                    // 'preferred_username': prefferedName, // do not remove this yet it might become usefull later if you have questions: ask Chant
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
                        {/*// do not remove this yet it might become usefull later if you have questions: ask Chant*/}
                        {/*<label>Username:</label>*/}
                        {/*<input*/}
                        {/*    className={`registerInput ${errorMessage.includes('Username') ? 'inputError' : ''} ${shouldShake ? 'inputShake' : ''}`}*/}
                        {/*    type="text"*/}
                        {/*    name="username"*/}
                        {/*    value={formData.username}*/}
                        {/*    onChange={handleChange}*/}
                        {/*    style={{ borderColor: errorMessage.includes('Username') ? 'red' : 'var(--secondary-color)' }}*/}
                        {/*/>*/}
                        {/*<label>User Name:</label>*/}
                        {/*<input*/}
                        {/*    className="registerInput"*/}
                        {/*    type="text"*/}
                        {/*    name="prefferedName"*/}
                        {/*    value={formData.prefferedName}*/}
                        {/*    onChange={handleChange}*/}
                        {/*/>*/}
                        <label>First Name:</label>
                        <input
                            className="registerInput"
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                        />

                        <label>Last Name:</label>
                        <input
                            className="registerInput"
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                        />

                        <label>Email:</label>
                        <input
                            className="registerInput"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <label>Phone Number:</label>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '5px' }}>
                            <select
                                name="countryCode"
                                value={formData.countryCode}
                                onChange={handleCountryCodeChange}
                                className="countryCodeDropdown"
                                style={{ width: '110%' }}
                            >
                                {countryCodes.map((country, index) => (
                                    <option key={index} value={country.code}>
                                        {country.name} ({country.code})
                                    </option>
                                ))}
                            </select>
                            <input
                                className="registerInput"
                                type="text"
                                name="phone"
                                placeholder="Phone Number"
                                value={formData.phone}
                                onChange={handleChange}
                                style={{ width: '100%' }} 
                            />
                        </div>

                        <label>Password:</label>
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
                                style={{borderColor: errorMessage.includes('Password') ? 'red' : 'var(--secondary-color)'}}
                            />
                        </div>
                        <div ref={strengthContainerRef} className="strength-container" style={{display: 'none'}}>
                            <div id="strength-bar" ref={strengthBarRef}></div>
                            <div className="strength-text" ref={strengthTextRef}></div>
                            <div className="requirements">
                                <label>
                                    <input type="checkbox" checked={requirements.length} readOnly/>
                                    At least 8 characters
                                </label>
                                <label>
                                    <input type="checkbox" checked={requirements.uppercase} readOnly/>
                                    At least 1 uppercase letter
                                </label>
                                <label>
                                    <input type="checkbox" checked={requirements.number} readOnly/>
                                    At least 1 number
                                </label>
                                <label>
                                    <input type="checkbox" checked={requirements.specialChar} readOnly/>
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
                            Already have an account? <a href="/login">Log in here</a>
                        </div>
                        {errorMessage && <div className="errorText">{errorMessage}</div>}
                        <button type="submit" className="registerButton" onClick={() => setShouldShake(true)}>Sign Up
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};


export default Register;
