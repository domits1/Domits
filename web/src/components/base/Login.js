import React, { useState, FormEvent, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleSubmit = async (e: FormEvent) => {
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
                    <div className="loginTitle">Log in or Sign Up</div>
                    <div className="loginForm">
                        <form onSubmit={handleSubmit}>
                            <label>Username:</label>
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
                                <div className='lbHolder'>
                                    <p className='lbText'>Login</p>
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 8L16 12M16 12L12 16M16 12H3M3.33782 7C5.06687 4.01099 8.29859 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C8.29859 22 5.06687 19.989 3.33782 17"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
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
