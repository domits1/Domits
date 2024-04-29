import React, { useState, FormEvent, useEffect, useContext } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FlowContext from '../../FlowContext';
import './Register.css';
import { flow } from 'lodash';

const Register = () => {
    const navigate = useNavigate();
    const { setAuthCredentials } = useAuth();
    const { flowState, setFlowState } = useContext(FlowContext)

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        repeatPassword: '',
        username: ''
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleHostChange = (e) => {
        setFlowState({ ...flowState, isHost: e.target.checked });
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        const userData = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            repeatPassword: formData.repeatPassword,
        };

        if (!userData.email) {
            setErrorMessage('Email can\'t be empty!');
            return;
        }

        if (!userData.password || !userData.repeatPassword) {
            setErrorMessage('Password can\'t be empty!');
            return;
        }

        if (userData.password !== userData.repeatPassword) {
            setErrorMessage('Passwords do not match!');
            return;
        }

        try {
            const groupName = flowState.isHost ? "Host" : "Traveler";
            const data = await Auth.signUp({
                username: userData.email,
                email: userData.email,
                password: userData.password,
                attributes: {
                    'custom:group': groupName,
                    'custom:username': userData.username
                },
            });

            setAuthCredentials(userData.email, userData.password);
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
                <button onClick={() => Auth.signOut()}>Sign out</button>
            ) : (
                <div className="registerContainer">
                    <div className="registerTitle">Create an account on Domits</div>
                    <form onSubmit={onSubmit} className="registerForm">
                        <label>Username:</label>
                        <input
                            className="registerInput"
                            type="text"
                            name="username"
                            value={formData.username}
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
                            className="registerInput"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
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
                            Already have an account? <a href="/login">Log in here</a>.
                        </div>
                        {errorMessage && <div className="errorText">{errorMessage}</div>}
                        <button type="submit" className="registerButton">Sign Up</button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Register;
