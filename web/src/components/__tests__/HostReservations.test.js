import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostReservations from '../hostdashboard/HostReservations';
import { Auth } from 'aws-amplify';

jest.mock('aws-amplify');
jest.mock('../hostdashboard/StripeModal', () => ({ isOpen, onClose }) => (
    isOpen ? <div data-testid="stripe-modal" onClick={onClose}>Stripe Modal</div> : null
));
jest.mock('../hostdashboard/Pages', () => () => <div>Pages Component</div>);
jest.mock('../hostdashboard/PagesDropdown', () => () => <div>PagesDropdown Component</div>);
jest.mock('../utils/ReservationItem', () => ({ reservation, selectedOption, selectedReservations, handleCheckboxChange }) => <div>Reservation Item</div>);
jest.mock('../utils/DateFormatterDD_MM_YYYY', () => date => `Formatted Date: ${date}`);

describe('HostReservations', () => {
    beforeEach(() => {
        Auth.currentAuthenticatedUser.mockResolvedValue({
            attributes: { sub: '123' }
        });
        Auth.currentUserInfo.mockResolvedValue({
            attributes: {
                sub: '123',
                email: 'test@example.com',
                'custom:username': 'Test User',
                address: '123 Test St',
                phone_number: '1234567890'
            }
        });
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ hasStripeAccount: true })
            })
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should handle empty reservations list gracefully', async () => {
        const mockEmptyReservations = {
            allReservations: [],
            acceptedReservations: [],
            reservedReservations: [],
            cancelledReservations: [],
            pendingReservations: []
        };

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ body: JSON.stringify(mockEmptyReservations) })
            })
        );

        const { getByText } = render(<HostReservations />);

        await waitFor(() => expect(getByText('Manage reservations')).toBeInTheDocument());

        await waitFor(() => {
            screen.debug();
            expect(getByText('You do not have any booking requests at the moment...')).toBeInTheDocument();
        });
    });
})
