import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import FlowContext from '../services/FlowContext';

// Mock the Auth module from AWS Amplify
jest.mock('aws-amplify', () => ({
    Auth: {
        confirmSignUp: jest.fn(),
        signIn: jest.fn(),
        resendSignUp: jest.fn()
    }
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
        state: {
            email: 'test@example.com',
            password: 'password123'
        }
    })
}));

describe.skip('ConfirmEmail', () => {
    const renderComponent = (flowState) => {
        render(
            <FlowContext.Provider value={{ flowState }}>
                <MemoryRouter>
                    <Routes>
                        <Route path="/" element={<ConfirmEmail />} />
                    </Routes>
                </MemoryRouter>
            </FlowContext.Provider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders the form initially', () => {
        renderComponent({ isHost: false });
        expect(screen.getByText('Verify your registration')).toBeInTheDocument();
        expect(screen.getByText('Enter 6 digit code sent to your email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /verify registration/i })).toBeInTheDocument();
    });

    test('handles successful confirmation and sign-in for non-host', async () => {
        Auth.confirmSignUp.mockResolvedValueOnce();
        Auth.signIn.mockResolvedValueOnce();

        renderComponent({ isHost: false });

        // Simulate entering the verification code
        const inputs = screen.getAllByRole('textbox');
        inputs.forEach((input, index) => {
            fireEvent.change(input, { target: { value: index + 1 } });
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /verify registration/i }));
        });

        await waitFor(() => {
            expect(Auth.confirmSignUp).toHaveBeenCalledWith('test@example.com', '123456');
            expect(Auth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });

    test('handles successful confirmation and sign-in for host', async () => {
        Auth.confirmSignUp.mockResolvedValueOnce();
        Auth.signIn.mockResolvedValueOnce();

        renderComponent({ isHost: true });

        // Simulate entering the verification code
        const inputs = screen.getAllByRole('textbox');
        inputs.forEach((input, index) => {
            fireEvent.change(input, { target: { value: index + 1 } });
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /verify registration/i }));
        });

        await waitFor(() => {
            expect(Auth.confirmSignUp).toHaveBeenCalledWith('test@example.com', '123456');
            expect(Auth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/hostdashboard');
        });
    });

    test('handles error during confirmation', async () => {
        const error = new Error('Invalid verification code');
        error.code = 'NotAuthorizedException';
        Auth.confirmSignUp.mockRejectedValueOnce(error);

        renderComponent({ isHost: false });

        // Simulate entering the verification code
        const inputs = screen.getAllByRole('textbox');
        inputs.forEach((input, index) => {
            fireEvent.change(input, { target: { value: index + 1 } });
        });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /verify registration/i }));
        });

        await waitFor(() => {
            expect(Auth.confirmSignUp).toHaveBeenCalledWith('test@example.com', '123456');
        });

        expect(screen.getByText('Invalid verification code or your account may already be confirmed. Please try to log in.')).toBeInTheDocument();
    });

    test('resends verification code', async () => {
        Auth.resendSignUp.mockResolvedValueOnce();

        renderComponent({ isHost: false });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /resend code/i }));
        });

        await waitFor(() => {
            expect(Auth.resendSignUp).toHaveBeenCalledWith('test@example.com');
        });
    });

    test('handles error during resending verification code', async () => {
        const error = new Error('Error resending code');
        Auth.resendSignUp.mockRejectedValueOnce(error);

        renderComponent({ isHost: false });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /resend code/i }));
        });

        await waitFor(() => {
            expect(Auth.resendSignUp).toHaveBeenCalledWith('test@example.com');
        });

        expect(screen.getByText('Failed to resend code, please try again later.')).toBeInTheDocument();
    });
});
