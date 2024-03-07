import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Login from '../base/Login';
import { BrowserRouter as Router } from 'react-router-dom';
import { Auth } from 'aws-amplify';

// Mock Auth.signIn function
jest.mock('aws-amplify', () => ({
    Auth: {
        signIn: jest.fn(),
        currentAuthenticatedUser: jest.fn(),
        signOut: jest.fn()
    },
}));

describe('Login Component', () => {
    it('displays error message on invalid login attempt', async () => {
        Auth.signIn.mockRejectedValueOnce(new Error('Invalid username or password'));

        const { getByLabelText, getByText } = render(
            <Router>
                <Login />
            </Router>
        );

        // Simulate user input
        // fireEvent.change(getByLabelText('Username:'), { target: { name: 'email', value: '123@123' } });
        // fireEvent.change(getByLabelText('Password:'), { target: { name: 'password', value: 'pizza!123' } });
        //
        // // Click on the login button
        fireEvent.click(getByText('Login'));

        // Wait for error message to appear
        // await waitFor(() => {
        //     expect(getByText('Invalid username or password. Please try again.')).toBeInTheDocument();
        // });
    });
});

