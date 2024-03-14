import React, { useState, FormEvent, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Import the AuthContext hook
import './Register.css';
// import { useMutation } from '@apollo/client';
// import { createUserMutation } from './graphql/mutations';

const Register = () => {
    const navigate = useNavigate();
    const { setAuthCredentials } = useAuth(); // Access setAuthCredentials from AuthContext
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

    const insertUserIdIntoDatabase = async (userId: string) => {
        // Call your function to insert userId into your user table here
        // Example:
        // await YourDatabaseService.insertUser(userId, formData.email, formData.username);
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const { username, email, password, repeatPassword } = formData;

        // Validation checks
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
            const groupName = "Traveler";
            const data = await Auth.signUp({
                username: email,
                password,
                attributes: {
                    'email': email,
                    'custom:group': groupName,
                    'custom:username': username
                },
            });

            // Store the email and password in the AuthContext
            setAuthCredentials(email, password);

            // Get user ID (sub) from Cognito response
            const userId = data.userSub;

            // Now you can insert the userId into your user table
            // For example, you can call a function to insert it
            insertUserIdIntoDatabase(userId);

            navigate('/confirm-email', {
                state: { email, username },
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