import React, { useState, FormEvent } from 'react';
import { Auth } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';

const components = [];

const Login = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        repeatPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const userData = {
            email: formData.email,
            password: formData.password,
            repeatPassword: formData.repeatPassword,
            "custom:group": "Guest",
        };

        if (userData.email !== '' && userData.password !== '') {
            try {
                await Auth.signIn(userData.email, userData.password);
                navigate('/');
            } catch (error) {
                console.error('Error logging in:', error);
            }
        } else if (userData.password !== userData.repeatPassword) {
            console.log('Passwords do not match!');
        } else {
            try {
                await Auth.signUp({
                    username: userData.email,
                    password: userData.password,
                    attributes: {
                        email: userData.email,
                        "custom:group": "Guest",
                    },
                    autoSignIn: { enabled: true },
                });
                navigate('/confirm-email', { state: { email: userData.email } });
            } catch (error) {
                if (error.code === 'UsernameExistsException') {
                    await Auth.resendSignUp(userData.email);
                    navigate('/confirm-email', { state: { email: userData.email } });
                } else {
                    console.error('Error:', error);
                }
            }
        }
    };

    return (
        <Authenticator loginMechanisms={['email']} components={components}>
            {({ signOut }) => (
                <>
                    <button onClick={signOut}>Sign out</button>
                    <form onSubmit={handleSubmit}>
                        <label>Email:
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </label>
                        <br />
                        <label>Password:
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </label>
                        <br />
                        <label>Repeat Password:
                            <input
                                type="password"
                                name="repeatPassword"
                                value={formData.repeatPassword}
                                onChange={handleChange}
                            />
                        </label>
                        <br />
                        <button type="submit">Login/Sign Up</button>
                    </form>
                </>
            )}
        </Authenticator>
    );
};

export default Login;
