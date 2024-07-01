import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from "../../logo.svg";
import FlowContext from '../../FlowContext';

const Login = () => {
    const navigate = useNavigate();
    const [group, setGroup] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const setUserGroup = async () => {
            try {
                const user = await Auth.currentAuthenticatedUser();
                const userAttributes = user.attributes;
                setGroup(userAttributes['custom:group']);
            } catch (error) {
                console.error('Error setting group:', error);
            }
        };

        setUserGroup();
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await Auth.currentAuthenticatedUser();
                const userAttributes = user.attributes;
                setIsAuthenticated(true);
                setGroup(userAttributes['custom:group']);

                if (userAttributes['custom:group'] === 'Host') {
                    navigate('/hostdashboard');
                } else if (userAttributes['custom:group'] === 'Traveler') {
                    navigate('/guestdashboard');
                }
            } catch (error) {
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSignIn = async () => {
        const { email, password } = formData;
        try {
            await Auth.signIn(email, password);
            setIsAuthenticated(true);
            setErrorMessage('');
            window.location.reload();
        } catch (error) {
            console.error('Error logging in:', error);
            setErrorMessage('Invalid username or password. Please try again.');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleSignIn();
    };

    const handleRegisterClick = () => {
        navigate('/register');
    };

    return (
        <>
            {isAuthenticated ? (
                <button onClick={handleSignOut}>Sign out</button>
            ) : (
                <div className="loginContainer">
                    <img src={logo} alt="Logo Domits" className='loginLogo' />
                    <div className="loginTitle">Good to see you again</div>
                    <div className="loginForm">
                        <form onSubmit={handleSubmit}>
                            <label htmlFor="email">Email:</label>
                            <br />
                            <input
                                id="email"
                                className="loginInput"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <br />
                            <label htmlFor="password" className="passwordLabel">Password:</label>
                            <br />
                            <input
                                id="password"
                                className="loginInput"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <br />
                            {errorMessage && (
                                <div className="errorText">{errorMessage}</div>
                            )}
                            <button type="submit" className="loginButton">
                                Login
                            </button>
                        </form>
                        <div className="noAccountText">
                            No account yet? Register for free!
                        </div>
                    
                        <button
                            onClick={handleRegisterClick}
                            className="registerButtonLogin"
                        >
                            Register
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Login;
