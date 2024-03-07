import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Login from '../base/Login';
import { BrowserRouter as Router } from 'react-router-dom';
import { Auth } from 'aws-amplify';

// Mock Auth.signIn function
jest.mock('aws-amplify', () => ({
    Auth: {
        signIn: jest.fn(),
    },
}));

describe('Login Component', () => {
    it('renders without crashing', () => {
        render(
            <Router>
                <Login />
            </Router>
        );
    });

    // it('displays error message on invalid login attempt', async () => {
    //     Auth.signIn.mockRejectedValueOnce(new Error('Invalid username or password'));
    //
    //     const { getByLabelText, getByText } = render(<Login />);
    //     fireEvent.change(getByLabelText('Username:'), { target: { value: 'quintenschaap12@gmail.com' } });
    //     fireEvent.change(getByLabelText('Password:'), { target: { value: 'pizza!123' } });
    //     fireEvent.click(getByText('Login'));

        // Wait for error message to appear
        // await waitFor(() => {
        //     expect(getByText('Invalid username or password. Please try again.')).toBeInTheDocument();
        // });
    // });
});
