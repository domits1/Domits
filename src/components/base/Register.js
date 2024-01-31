import React, {useState, FormEvent, useEffect} from 'react';
import {Auth} from 'aws-amplify';
import {useNavigate} from 'react-router-dom';
import './Register.css';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        repeatPassword: '',
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const userData = {
            email: formData.email,
            password: formData.password,
            repeatPassword: formData.repeatPassword,
        };

        if (userData.password !== userData.repeatPassword) {
            console.log("Passwords do not match!");
            return;
        }

        try {
            const data = await Auth.signUp({
                username: userData.email,
                password: userData.password,
                attributes: {
                    email: userData.email,
                },
            });

            navigate('/confirm-email', {
                state: { email: userData.email, username: data.user.getUsername() },
            });
        } catch (error) {
            if (error.code === 'UsernameExistsException') {
                // Handle case where user already exists (optional)
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
                        <label>Email:</label>
                        <br/>
                        <input
                            className="registerInput"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <br/>
                        <label className="passwordLabel">Password:</label>
                        <br/>
                        <input
                            className="registerInput"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <br/>
                        <label className="passwordLabel">Repeat Password:</label>
                        <br/>
                        <input
                            className="registerInput"
                            type="password"
                            name="repeatPassword"
                            value={formData.repeatPassword}
                            onChange={handleChange}
                        />
                        <br/>
                        <div className="alreadyAccountText">
                            Already have an account? <a href="/login">Log in here</a>.
                        </div>
                        <button type="submit" className="registerButton">
                            Sign Up
                        </button>
                    </form>
                </div>
            </div>
        )}
    </>
)};

export default Register;
