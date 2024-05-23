import React, { useState, FormEvent, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from "../../logo.svg";
import FlowContext from '../../FlowContext';

const Login = () => {
    const navigate = useNavigate();
    const [group, setGroup] = useState('');

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

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
            if (group = "Host") {
                window.location("/Hostdashboard")
            }
            setErrorMessage('');
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
                            <label>Email:</label>
                            <br />
                            <input
                                className="loginInput"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <br />
                            <label className="passwordLabel">Password:</label>
                            <br />
                            <input
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
