import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from "../../logo.svg";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import FlowContext from '../../FlowContext';

const Login = () => {
    const navigate = useNavigate();
    const [group, setGroup] = useState('');
    const [forgotPassword, setForgotPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [username, setUsername] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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
    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
    }

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

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const setValueForForgotPassword = (value) => {
        setForgotPassword(value);
    };
    const handlePasswordRecovery = async () => {
        console.log(formData.email);
        const response = await getUserIDUsingEmail(formData.email);
        console.log(response);
        try {
            const data = await Auth.forgotPassword(response);
            console.log(data);
            return data;
        } catch (err) {
            console.log(err);
        }
    };

    const getUserIDUsingEmail = async (email) => {
        try {
            const response = await fetch('https://mncmdr9bol.execute-api.eu-north-1.amazonaws.com/default/GetUserIDUsingEmail', {
                method: 'POST',
                body: JSON.stringify({email: email}),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (data) {
                return data.body;
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function forgotPasswordSubmit(username, code, newPassword) {
        try {
            const data = await Auth.forgotPasswordSubmit(username, code, newPassword);
            console.log(data);
        } catch (err) {
            console.log(err);
        }
    }

    return (
        <>
            {isAuthenticated ? (
                <button onClick={handleSignOut}>Sign out</button>
            ) : (
                <div className="loginContainer">
                    <img src={logo} alt="Logo Domits" className='loginLogo' />
                    <div className="loginTitle">Good to see you again</div>
                    {forgotPassword ? (
                        <div>
                            <label htmlFor="email">What is your E-mail?</label>
                            <input
                                className="loginInput"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <button type="click" className="loginButton" onClick={handlePasswordRecovery}>
                                Recover password
                            </button>
                            <button type="click" className="registerButtonLogin"
                                    onClick={() => setValueForForgotPassword(false)}>
                                Go back
                            </button>
                        </div>
                    ) : (
                        <div className="loginForm">
                            <form onSubmit={handleSubmit}>
                                <label htmlFor="email">Email:</label>
                                <br/>
                                <input
                                    id="email"
                                    className="loginInput"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                                <br/>
                                <label htmlFor="password" className="passwordLabel">Password:</label>
                                <br/>
                                <div className="passwordContainer">
                                    <input
                                        id="password"
                                        className="loginInput"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="togglePasswordButton"
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <FaEye/> : <FaEyeSlash/>}
                                    </button>
                                </div>
                                <br/>
                                {errorMessage && (
                                    <div className="errorText">{errorMessage}</div>
                                )}
                                <div className="noAccountText" onClick={() => setValueForForgotPassword(true)}>
                                    I forgot my password
                                </div>
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
                    )}

                </div>
            )}
        </>
    );
};

export default Login;
