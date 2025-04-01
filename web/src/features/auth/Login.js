import React, {useState, useEffect, useRef} from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
// import './Login.css';
import logo from "../../images/logo.svg";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import FlowContext from '../../services/FlowContext';
import DigitInputs from "../../components/ui/DigitsInputs/DigitsInputs";

const Login = () => {
    const navigate = useNavigate();
    const [group, setGroup] = useState('');
    const [forgotPassword, setForgotPassword] = useState(false);
    const [confirmCode, setConfirmCode] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [username, setUsername] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef([]);
    const handleResendCode = () => {
        if (formData.email === '') {
            navigate('/register');
        } else {
            handlePasswordRecovery().catch(err => {
                console.error("Error resending code:", err);
                setErrorMessage("Failed to resend code, please try again later.");
            });
        }
    };

    const submitCodeAndPassword = async () => {
        let code = "";
        inputRef.current.forEach((input) => { code += input.value });

        try {
            const response = await forgotPasswordSubmit(username, code, formData.password);
        } catch (err) {
            console.error(err);
        }
    };
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
        if (errorMessage) {
            setErrorMessage('');
        }
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
        const response = await getUserIDUsingEmail(formData.email);
        try {
            return await Auth.forgotPassword(response);
        } catch (err) {
            setErrorMsg('This user does not exist!');
        } finally {
            setForgotPassword(false);
            setConfirmCode(true);
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
                setUsername(data.body);
                return data.body;
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function forgotPasswordSubmit(username, code, newPassword) {
        setErrorMessage('');
        setErrorMsg('');
        try {
            const data = await Auth.forgotPasswordSubmit(username, code, newPassword);
        } catch (err) {
            setErrorMessage(err.message);
        }finally {
            if (errorMessage === '') {
                window.alert('Your password has been updated successfully! Sending you back to the login page...');
                setConfirmCode(false);
            }
        }
    }

    return (
        <>
            {isAuthenticated ? (
                <button onClick={handleSignOut}>Sign out</button>
            ) : (
                <main className="loginContainer">
                    {forgotPassword ? (
                        <main className="loginContainer emailSection">
                            <div className="confirmEmailTitle">Please provide your E-Mail</div>
                            <label htmlFor="email">What is your E-Mail?</label>
                            <input
                                className="loginInput"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            {errorMsg && (
                                <p>{errorMsg}</p>
                            )}
                            <button type="click" className="loginButton" onClick={handlePasswordRecovery}>
                                Recover password
                            </button>
                            <button type="click" className="registerButtonLogin"
                                    onClick={() => setValueForForgotPassword(false)}>
                                Go back
                            </button>
                        </main>
                    ) : confirmCode ? (
                        <main className="confirmEmailContainer">
                            <div className="confirmEmailTitle">Step 1: Enter your two-factor authentication code</div>
                            <div className="confirmEmailForm">
                                <div className="enter6DigitText">
                                    Enter 6 digit code sent to your email
                                </div>
                                <DigitInputs amount={6} inputRef={inputRef}/>
                                {errorMessage && (
                                    <div className="errorText">{errorMessage}</div>
                                )}
                                <div className="notReceivedCodeText">
                                    Didn't received a code? Check your spam folder or let us resend a code.
                                </div>
                                <button className="resendCodeButton" type="button" onClick={handleResendCode}>Resend
                                    code
                                </button>
                            </div>
                            <div className="confirmEmailTitle">Step 2: Create a new password</div>
                            <div className="confirmEmailForm">
                                <div className="enter6DigitText">
                                    Enter your new password
                                </div>
                                <div>
                                    <label htmlFor="password" className="passwordLabel">New password:</label>
                                    <input
                                        id="password"
                                        className="loginInput"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                                {errorMessage && (
                                    <p>{errorMessage}</p>
                                )}
                                <button className="verifyRegisterButton" type="click"
                                        onClick={submitCodeAndPassword}>Confirm
                                </button>
                            </div>
                        </main>
                    ) : (
                        <main className="loginContainer">
                            {/* <img src={logo} alt="Logo Domits" className='loginLogo'/> */}
                            <div className="loginTitle">Good to see you again</div>
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
                                    <div className="forgotPasswordText noAccountText" onClick={() => setValueForForgotPassword(true)}>
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
                        </main>
                    )}
                </main>
            )}
        </>
    );
};

export default Login;
