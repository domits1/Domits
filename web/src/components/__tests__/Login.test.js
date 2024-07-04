// Login.test.js
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../base/Login.js';
import { Auth } from 'aws-amplify';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router';

jest.mock('aws-amplify');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe.skip('Login Component', () => {
  const mockSignIn = Auth.signIn;
  const mockCurrentAuthenticatedUser = Auth.currentAuthenticatedUser;
  const mockNavigate = jest.fn();

  beforeEach(() => {
    mockSignIn.mockClear();
    mockCurrentAuthenticatedUser.mockClear();
    mockNavigate.mockClear();
  });

  test('renders login form', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  test('handles form input changes', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password');
  });

  test('handles form submission and successful login', async () => {
    mockSignIn.mockResolvedValueOnce({});

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });

    fireEvent.click(screen.getByText(/login/i));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password'));
    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
  });

  test('handles form submission and login failure', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid username or password'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });

    fireEvent.click(screen.getByText(/login/i));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password'));
    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });
});
