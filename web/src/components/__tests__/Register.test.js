import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FlowContext } from '../../FlowContext.js';
import Register from '../../features/auth/Register';
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

describe.skip('Register', () => {
    it('should navigate to confirm-email when registration is successful', async () => {
        const mockNavigate = jest.fn();
        useNavigate.mockReturnValue(mockNavigate);

        Auth.signUp.mockResolvedValue({});

        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Repeat Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText(/Sign Up/i));

        await waitFor(() => expect(Auth.signUp).toHaveBeenCalled());
        expect(mockNavigate).toHaveBeenCalledWith('/confirm-email', {
            state: { email: 'test@example.com', password: 'password123' },
        });
    });

    it('should display error message when password is less than 7 characters', () => {
        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText(/Sign Up/i));
        expect(screen.getByText('Password must be at least 7 characters long.')).toBeInTheDocument();
    });

    it('should display error message when username is less than 4 characters', () => {
        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'abc' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Repeat Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText(/Sign Up/i));
        expect(screen.getByText('Username must be at least 4 characters long.')).toBeInTheDocument();
    });

    it('should display error message when email is empty', () => {
        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Repeat Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText(/Sign Up/i));
        expect(screen.getByText(/Email can't be empty!/i)).toBeInTheDocument();
    });

    it('should toggle isHost state when handleHostChange is called', () => {
        const mockSetFlowState = jest.fn();

        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: mockSetFlowState }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.click(screen.getByLabelText(/Become a Host/i));
        expect(mockSetFlowState).toHaveBeenCalledWith({ isHost: true });
    });

    it('should display error message when passwords do not match', () => {
        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Repeat Password/i), { target: { value: 'password456' } });
        fireEvent.click(screen.getByText(/Sign Up/i));
        expect(screen.getByText('Passwords do not match!')).toBeInTheDocument();
    });

    it('should display error message when password is empty', () => {
        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText(/Repeat Password/i), { target: { value: '' } });
        fireEvent.click(screen.getByText(/Sign Up/i));
        expect(screen.getByText(/Password can't be empty!/i)).toBeInTheDocument();
    });

    it('should display error message when password is empty', () => {
        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText(/Repeat Password/i), { target: { value: '' } });
        fireEvent.click(screen.getByText(/Sign Up/i));
        expect(screen.getByText(/Password can't be empty!/i)).toBeInTheDocument();
    });

    it('should generate a random username during form submission', async () => {
        const mockNavigate = jest.fn();
        useNavigate.mockReturnValue(mockNavigate);

        // Spy on the generateRandomUsername function
        const generateRandomUsernameSpy = jest.spyOn(Register.prototype, 'generateRandomUsername');

        Auth.signUp.mockResolvedValue({});

        render(
            <FlowContext.Provider value={{ flowState: { isHost: false }, setFlowState: jest.fn() }}>
                <Register />
            </FlowContext.Provider>
        );

        fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText(/Repeat Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText(/Sign Up/i));

        // Wait for the username generation
        await waitFor(() => expect(generateRandomUsernameSpy).toHaveBeenCalled());

        expect(Auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
            username: 'test@example.com',
            attributes: expect.objectContaining({
                'custom:username': expect.any(String),
            }),
        }));

        generateRandomUsernameSpy.mockRestore();
    });
});
