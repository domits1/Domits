// BookingOverview.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import BookingOverview from '../BookingOverview';

jest.mock('aws-amplify');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: () => ({
        state: {
            details: {
                accommodation: { Title: 'Test Accommodation', Description: 'Test Description' },
                checkIn: '2022-01-01',
                checkOut: '2022-01-07',
                adults: 2,
                kids: 1,
                pets: 0
            }
        }
    }),
    useNavigate: jest.fn(),
}));

describe.skip('BookingOverview Component', () => {
    beforeEach(() => {
        Auth.currentSession.mockResolvedValue({});
        Auth.currentAuthenticatedUser.mockResolvedValue({
            attributes: {
                'custom:username': 'TestUser',
                email: 'testuser@example.com',
            },
        });
    });

    test('renders BookingOverview component', async () => {
        render(
            <BrowserRouter>
                <BookingOverview />
            </BrowserRouter>
        );

        await waitFor(() => expect(screen.getByText('Test Accommodation')).toBeInTheDocument());
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('2022-01-01 - 2022-01-07')).toBeInTheDocument();
        expect(screen.getByText('2 adults - 1 kids')).toBeInTheDocument();
    });

    test('displays user information when logged in', async () => {
        render(
            <BrowserRouter>
                <BookingOverview />
            </BrowserRouter>
        );

        await waitFor(() => expect(screen.getByText('Hello TestUser!')).toBeInTheDocument());
        expect(screen.getByLabelText(/Name/i).value).toBe('TestUser');
        expect(screen.getByLabelText(/Email address/i).value).toBe('testuser@example.com');
    });

    test('renders Register component when not logged in', async () => {
        Auth.currentSession.mockRejectedValue(new Error('No session'));
        Auth.currentAuthenticatedUser.mockRejectedValue(new Error('No user'));

        render(
            <BrowserRouter>
                <BookingOverview />
            </BrowserRouter>
        );

        await waitFor(() => expect(screen.getByText('Create an account on Domits')).toBeInTheDocument());
    });

    test('handles Confirm & Pay button click', async () => {
        console.log = jest.fn();

        render(
            <BrowserRouter>
                <BookingOverview />
            </BrowserRouter>
        );

        await waitFor(() => expect(screen.getByText('Hello TestUser!')).toBeInTheDocument());
        
        fireEvent.click(screen.getByText(/Confirm & Pay/i));
        expect(console.log).toHaveBeenCalledWith('Payment confirmed');
    });
});
