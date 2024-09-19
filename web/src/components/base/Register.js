import React, { useState, useContext, useEffect } from 'react';
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
        for (let i = 0; i < 10; i++) {  // Generate 20 characters
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
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [signUpClicked, setSignUpClicked] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);
    const [passwordShake, setPasswordShake] = useState(false);

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
        const {username, email, password, repeatPassword, firstName, lastName } = formData;

        // do not remove this yet it might become usefull later if you have questions: ask Chant
        // if (prefferedName.length < 1) {
        //     setErrorMessage('Preferred name cannot be empty.');
        //     return;
        // }

        if (firstName.length < 1) {
            setErrorMessage('First name cannot be empty.');
            return;
        }
        if (lastName.length < 1) {
            setErrorMessage('Last name cannot be empty.');
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

        const regex = /^(?=.*[A-Z])(?=.*\d).+$/;
        if (!regex.test(password)) {
            setErrorMessage('Password must contain at least one uppercase letter and one number.');
            setPasswordShake(true);
            return;
        }
        if (!email) {
            setErrorMessage('Email can\'t be empty!');
            return;
        }

        if (!password || !repeatPassword) {
            setErrorMessage('Password can\'t be empty!');
            return;
        }

        if (password !== repeatPassword) {
            setErrorMessage('Passwords do not match!');
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
                        <label>Password:</label>
                        <input
                            className={`registerInput ${errorMessage.includes('Password') ? 'inputError' : ''} ${passwordShake ? 'inputShake' : ''}`}
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            style={{ borderColor: errorMessage.includes('Password') ? 'red' : 'var(--secondary-color)' }}
                        />
                        <label>Repeat Password:</label>
                        <input
                            className="registerInput"
                            type="password"
                            name="repeatPassword"
                            value={formData.repeatPassword}
                            onChange={handleChange}
                        />
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
                        <button type="submit" className="registerButton" onClick={() => setShouldShake(true)}>Sign Up</button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Register;