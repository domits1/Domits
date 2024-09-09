// Register.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import FlowContext from '../../FlowContext'; // Import FlowContext
import './Register.css';

const Register = () => {
    const navigate = useNavigate();
    const { flowState, setFlowState } = useContext(FlowContext)

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        repeatPassword: '',
        username: ''
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

    const onSubmit = async (e) => {
        e.preventDefault();
        const { username, email, password, repeatPassword } = formData;
    
        if (username.length < 4) {
            setErrorMessage('Username must be at least 4 characters long.');
            setShouldShake(true);
            return;
        }
        if (password.length < 7) {
            setErrorMessage('Password must be at least 7 characters long.');
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
            const groupName = flowState.isHost ? "Host" : "Traveler";
            await Auth.signUp({
                username: email,
                password,
                attributes: {
                    'custom:group': groupName,
                    'custom:username': username
                },
            });
    

            navigate('/confirm-email', {
                state: { email, password }
            });
        } catch (error) {
            if (error.code === 'UsernameExistsException') {
                setErrorMessage('User already exists!');
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
                        <label>Username:</label>
                        <input
                            className={`registerInput ${errorMessage.includes('Username') ? 'inputError' : ''} ${shouldShake ? 'inputShake' : ''}`}
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            style={{ borderColor: errorMessage.includes('Username') ? 'red' : 'var(--secondary-color)' }}
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