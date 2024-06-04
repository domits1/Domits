import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FlowContext } from '../../FlowContext.js';
import Register from '../base/Register'; // Ensure the correct path
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

jest.mock('aws-amplify', () => ({
    Auth: {
        signUp: jest.fn(),
    },
}));

describe('Register', () => {
    it('should navigate to confirm-email when registration is successful', async () => {
        const mockNavigate = jest.fn();
        mockNavigate.mockImplementation((path, state) => {
            window.location.href = path;
        });

        Auth.signUp.mockImplementation(async () => {
            throw new Error('Mock error');
        });

        const fillInput = (label, value) => {
            fireEvent.change(screen.getByLabelText(label), { target: { value } });
        };

        const { getByLabelText: getByLabel, getByText: getByTxt } = screen;
        render(
            <FlowProvider>
                <Register />
            </FlowProvider>
        );

        fillInput(/Username/i, 'testuser');
        fillInput(/Email/i, 'test@example.com');
        fillInput(/Password/i, 'password123');
        fillInput(/Repeat Password/i, 'password123');

        console.log("Before clicking Sign Up button");
        fireEvent.click(getByTxt(/Sign Up/i));
        console.log("After clicking Sign Up button");

        try {
            await waitFor(() => expect(Auth.signUp).toHaveBeenCalled());
        } catch (error) {
            console.error("Error during signUp:", error);
        }

        expect(mockNavigate).toHaveBeenCalledWith('/confirm-email', {
            state: { email: 'test@example.com', password: 'password123' },
        });
    });

    it('should display error message when password is less than 7 characters', () => {
        const { getByLabelText, getByText } = render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(getByLabelText(/Password/i), { target: { value: 'pass' } });
        fireEvent.click(getByText(/Sign Up/i));
        expect(getByText('Password must be at least 7 characters long.')).toBeInTheDocument();
    });

    it('should display error message when username is less than 4 characters', () => {
        const { getByLabelText, getByText } = render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(getByLabelText(/Username/i), { target: { value: 'abc' } });
        fireEvent.change(getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(getByLabelText(/Repeat Password/i), { target: { value: 'password123' } });
        fireEvent.click(getByText(/Sign Up/i));
        expect(getByText('Username must be at least 4 characters long.')).toBeInTheDocument();
    });

    it('should display error message when email is empty', () => {
        const { getByLabelText, getByText } = render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(getByLabelText(/Email/i), { target: { value: '' } });
        fireEvent.change(getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(getByLabelText(/Repeat Password/i), { target: { value: 'password123' } });
        fireEvent.click(getByText(/Sign Up/i));
        expect(getByText(/Email can't be empty!/i)).toBeInTheDocument();
    });

    it('should toggle isHost state when handleHostChange is called', () => {
        const mockSetFlowState = jest.fn();
        const { getByLabelText } = render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: mockSetFlowState }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.click(getByLabelText(/Become a Host/i));
        expect(mockSetFlowState).toHaveBeenCalledWith({ isHost: true });
    });

    it('should navigate to confirm-email when registration is successful', async () => {
        const mockNavigate = useNavigate();
        Auth.signUp.mockResolvedValue({});

        const { getByLabelText, getByText } = render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(getByLabelText(/Repeat Password/i), { target: { value: 'password123' } });
        fireEvent.click(getByText(/Sign Up/i));

        await waitFor(() => expect(Auth.signUp).toHaveBeenCalled());
        expect(mockNavigate).toHaveBeenCalledWith('/confirm-email', {
            state: { email: 'test@example.com', password: 'password123' },
        });
    });

    it('should display error message when passwords do not match', () => {
        const { getByLabelText, getByText } = render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(getByLabelText(/Repeat Password/i), { target: { value: 'password456' } });
        fireEvent.click(getByText(/Sign Up/i));
        expect(getByText('Passwords do not match!')).toBeInTheDocument();
    });

    it('should display error message when password is empty', () => {
        const { getByLabelText, getByText } = render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(getByLabelText(/Password/i), { target: { value: '' } });
        fireEvent.change(getByLabelText(/Repeat Password/i), { target: { value: '' } });
        fireEvent.click(getByText(/Sign Up/i));
        expect(getByText(/Password can't be empty!/i)).toBeInTheDocument();
    });
});
