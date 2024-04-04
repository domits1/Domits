import React, { useState, FormEvent, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import the AuthContext hook
import FlowContext from '../../FlowContext'; // Ensure this is the correct path
import './Register.css';

const Register = () => {
    const navigate = useNavigate();
    const { setAuthCredentials } = useAuth(); // Access setAuthCredentials from AuthContext
    const { flowState } = useContext(FlowContext); // Correctly use useContext at the top level

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        repeatPassword: '',
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const userData = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            repeatPassword: formData.repeatPassword,
        };

        if (userData.email === "" || userData.email === null) {
            setErrorMessage('Email can\'t be empty!');
            return;
        }

        if (userData.password === "" || userData.password === null || userData.repeatPassword === "" || userData.repeatPassword === null) {
            setErrorMessage('Password can\'t be empty!');
            return;
        }

        if (userData.password !== userData.repeatPassword) {
            setErrorMessage('Passwords does not match!');
            return;
        }

        try {
            // const groupName = flowState.isHost ? "Host" : "Traveler"; // Use flowState.isHost directly
            const groupName = "Traveler"
            const data = await Auth.signUp({
                username: userData.email,
                email: userData.email,
                password: userData.password,
                attributes: {
                    'custom:group': groupName,
                    'custom:username': userData.username
                },
            });

            // Store the email and password in the AuthContext
            setAuthCredentials(userData.email, userData.password);

            sessionStorage.setItem('userEmail', userData.email);

            navigate('/confirm-email', {
                state: { email: userData.email, username: data.user.getUsername() },
            });
        } catch (error) {
            if (error.code === 'UsernameExistsException') {
                setErrorMessage('User already exists!');
            } else {
                console.error("Error:", error);
            }
        }
    };

    const handleSignOut = async () => {
        try {
            await Auth.signOut();
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error signing out:', error);
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

    return (
        <>
            {isAuthenticated ? (
                <button onClick={handleSignOut}>Sign out</button>
            ) : (
                <div className="registerContainer">
                    {/* <button onClick={testFunc}>testacc</button> */}
                    <div className="registerTitle">Sign Up</div>
                    <div className="registerForm">
                        <form onSubmit={onSubmit}>
                            <label>Username:</label>
                            <br />
                            <input
                                className="registerInput"
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                            />
                            <br />
                            <label>Email:</label>
                            <br />
                            <input
                                className="registerInput"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <br />
                            <label className="passwordLabel">Password:</label>
                            <br />
                            <input
                                className="registerInput"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <br />
                            <label className="passwordLabel">Repeat Password:</label>
                            <br />
                            <input
                                className="registerInput"
                                type="password"
                                name="repeatPassword"
                                value={formData.repeatPassword}
                                onChange={handleChange}
                            />
                            <br />
                            <div className="alreadyAccountText">
                                Already have an account? <a href="/login">Log in here</a>.
                            </div>
                            {errorMessage && (
                                <div className="errorText">{errorMessage}</div>
                            )}
                            <button type="submit" className="registerButton">
                                Sign Up
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
};

export default Register;