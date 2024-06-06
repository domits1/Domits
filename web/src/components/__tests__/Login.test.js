import { render, fireEvent, waitFor } from '@testing-library/react';
import Login from '../base/Login.js'; // Adjust the import based on your file structure
import { Auth } from 'aws-amplify'; // Adjust based on your auth library
import { BrowserRouter as Router } from 'react-router-dom'; // or MemoryRouter for isolated testing

jest.mock('aws-amplify');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

const mockNavigate = require('react-router-dom').useNavigate();

describe('Login', () => {

    // Successful login redirects Host to /hostdashboard
    it('should redirect Host to /hostdashboard on successful login', async () => {
        const { getByLabelText, getByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const emailInput = getByLabelText(/email/i);
        const passwordInput = getByLabelText(/password/i);
        const loginButton = getByText(/login/i);

        fireEvent.change(emailInput, { target: { value: 'host@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });

        Auth.signIn.mockResolvedValue({
            attributes: { 'custom:group': 'Host' }
        });

        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(Auth.signIn).toHaveBeenCalledWith('host@example.com', 'password');
            expect(mockNavigate).toHaveBeenCalledWith('/hostdashboard');
        });
    });

    // Successful login redirects Traveler to /guestdashboard
    it('should redirect Traveler to /guestdashboard on successful login', async () => {
        const { getByLabelText, getByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const emailInput = getByLabelText(/email/i);
        const passwordInput = getByLabelText(/password/i);
        const loginButton = getByText(/login/i);

        fireEvent.change(emailInput, { target: { value: 'traveler@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });

        Auth.signIn.mockResolvedValue({
            attributes: { 'custom:group': 'Traveler' }
        });

        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(Auth.signIn).toHaveBeenCalledWith('traveler@example.com', 'password');
            expect(mockNavigate).toHaveBeenCalledWith('/guestdashboard');
        });
    });

    // User can sign out successfully
    it('should sign out successfully', async () => {
        Auth.signOut.mockResolvedValue();

        const { getByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const signOutButton = getByText(/sign out/i);

        fireEvent.click(signOutButton);

        await waitFor(() => {
            expect(Auth.signOut).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    // User can navigate to registration page
    it('should navigate to registration page when register button is clicked', () => {
        const { getByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const registerButton = getByText(/register/i);

        fireEvent.click(registerButton);

        expect(mockNavigate).toHaveBeenCalledWith('/register');
    });

    // Error message is displayed for invalid login credentials
    it('should display error message for invalid login credentials', async () => {
        Auth.signIn.mockRejectedValue(new Error('Invalid username or password'));

        const { getByLabelText, getByText, findByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const emailInput = getByLabelText(/email/i);
        const passwordInput = getByLabelText(/password/i);
        const loginButton = getByText(/login/i);

        fireEvent.change(emailInput, { target: { value: 'invalid@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

        fireEvent.click(loginButton);

        const errorMessage = await findByText(/invalid username or password/i);
        expect(errorMessage).toBeInTheDocument();
    });

    // Form inputs update state correctly on change
    it('should update form inputs state correctly on change', () => {
        const { getByLabelText } = render(
            <Router>
                <Login />
            </Router>
        );
        const emailInput = getByLabelText(/email/i);
        const passwordInput = getByLabelText(/password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });

        expect(emailInput.value).toBe('test@example.com');
        expect(passwordInput.value).toBe('password');
    });

    // User with no group attribute should not be redirected
    it('should not redirect user with no group attribute', async () => {
        Auth.currentAuthenticatedUser.mockResolvedValue({
            attributes: {}
        });

        render(
            <Router>
                <Login />
            </Router>
        );

        await waitFor(() => {
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    // User with incorrect email format should see an error
    it('should display error for incorrect email format', async () => {
        const { getByLabelText, getByText, findByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const emailInput = getByLabelText(/email/i);
        const passwordInput = getByLabelText(/password/i);
        const loginButton = getByText(/login/i);

        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });

        fireEvent.click(loginButton);

        const errorMessage = await findByText(/invalid email format/i);
        expect(errorMessage).toBeInTheDocument();
    });

    // User with empty password should see an error
    it('should display error for empty password', async () => {
        const { getByLabelText, getByText, findByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const emailInput = getByLabelText(/email/i);
        const passwordInput = getByLabelText(/password/i);
        const loginButton = getByText(/login/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: '' } });

        fireEvent.click(loginButton);

        const errorMessage = await findByText(/password cannot be empty/i);
        expect(errorMessage).toBeInTheDocument();
    });

    // Network failure during login attempt should display an error
    it('should display error on network failure during login attempt', async () => {
        Auth.signIn.mockRejectedValue(new Error('Network Error'));

        const { getByLabelText, getByText, findByText } = render(
            <Router>
                <Login />
            </Router>
        );
        const emailInput = getByLabelText(/email/i);
        const passwordInput = getByLabelText(/password/i);
        const loginButton = getByText(/login/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password' } });

        fireEvent.click(loginButton);

        const errorMessage = await findByText(/network error/i);
        expect(errorMessage).toBeInTheDocument();
    });

    // Auth.currentAuthenticatedUser throws an error
    it('should handle error when Auth.currentAuthenticatedUser throws an error', async () => {
        Auth.currentAuthenticatedUser.mockRejectedValue(new Error('Auth Error'));

        render(
            <Router>
                <Login />
            </Router>
        );

        await waitFor(() => {
            expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
            // Additional assertions can be added based on how the component handles the error
        });
    });

    // Authenticated user is redirected based on group on initial load
    it('should redirect authenticated user based on group on initial load', async () => {
        Auth.currentAuthenticatedUser.mockResolvedValue({
            attributes: { 'custom:group': 'Traveler' }
        });

        render(
            <Router>
                <Login />
            </Router>
        );

        await waitFor(() => {
            expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/guestdashboard');
        });
    });

    // Non-authenticated user does not get redirected on initial load
    it('should not redirect non-authenticated user on initial load', async () => {
        Auth.currentAuthenticatedUser.mockResolvedValue(null);

        render(
            <Router>
                <Login />
            </Router>
        );

        await waitFor(() => {
            expect(Auth.currentAuthenticatedUser).toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });
});
