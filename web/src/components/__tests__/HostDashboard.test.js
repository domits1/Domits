import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import HostDashboard from './hostdashboard/HostDashboard'; // Adjust this path if necessary
import StripeModal from '../hostdashboard/StripeModal';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';

jest.mock('aws-amplify');
jest.mock('react-router-dom', () => ({
    useNavigate: jest.fn(),
}));
jest.mock('./hostdashboard/StripeModal', () => ({ isOpen, onClose }) => (
    isOpen ? <div data-testid="stripe-modal" onClick={onClose}>Stripe Modal</div> : null
));
jest.mock('./hostdashboard/Pages', () => () => <div>Pages Component</div>);
jest.mock('./hostdashboard/PagesDropdown', () => () => <div>PagesDropdown Component</div>);
jest.mock('../../utils/ImageSlider', () => ({ images, seconds }) => <div>Image Slider</div>);
jest.mock('../../utils/DateFormatterDD_MM_YYYY', () => date => `Formatted Date: ${date}`);

describe('HostDashboard', () => {
    const navigate = jest.fn();

    beforeEach(() => {
        useNavigate.mockReturnValue(navigate);
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
                json: () => Promise.resolve({ hasStripeAccount: false })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    body: JSON.stringify([
                        {
                            ID: '1',
                            Title: 'Test Accommodation',
                            City: 'Test City',
                            Street: 'Test Street',
                            PostalCode: '12345',
                            Images: [],
                            createdAt: '2023-01-01',
                            StartDate: '2023-01-10',
                            EndDate: '2023-01-20'
                        }
                    ])
                })
            });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders HostDashboard component correctly', async () => {
        render(<HostDashboard />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Welcome')).toBeInTheDocument();
        expect(screen.getByText('Pages Component')).toBeInTheDocument();
        expect(screen.getByText('PagesDropdown Component')).toBeInTheDocument();
        expect(screen.getByText('My recent listings:')).toBeInTheDocument();

        await waitFor(() => expect(screen.getByTestId('stripe-modal')).toBeInTheDocument());

        expect(screen.getByTestId('stripe-modal')).toHaveTextContent('Stripe Modal');

        await waitFor(() => expect(screen.getByText('Test Accommodation')).toBeInTheDocument());
    });

    test('handles refresh button click', async () => {
        render(<HostDashboard />);

        await waitFor(() => expect(screen.getByText('Refresh')).toBeInTheDocument());
        
        fireEvent.click(screen.getByText('Refresh'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    });

    test('handles navigation to listings page', async () => {
        render(<HostDashboard />);

        await waitFor(() => expect(screen.getByText('Go to listing')).toBeInTheDocument());
        
        fireEvent.click(screen.getByText('Go to listing'));

        expect(navigate).toHaveBeenCalledWith('/hostdashboard/listings');
    });

    test('handles accommodation click', async () => {
        render(<HostDashboard />);

        await waitFor(() => expect(screen.getByText('Test Accommodation')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Test Accommodation'));

        expect(navigate).toHaveBeenCalledWith('/listingdetails?ID=1');
    });

    test('displays loading spinner', async () => {
        render(<HostDashboard />);

        expect(screen.getByAltText('spinner')).toBeInTheDocument();

        await waitFor(() => expect(screen.queryByAltText('spinner')).not.toBeInTheDocument());
    });

    test('displays personal information', async () => {
        render(<HostDashboard />);

        await waitFor(() => expect(screen.getByText('Personal Information')).toBeInTheDocument());

        expect(screen.getByText('Email:')).toBeInTheDocument();
        expect(screen.getByText('Name:')).toBeInTheDocument();
        expect(screen.getByText('Address:')).toBeInTheDocument();
        expect(screen.getByText('Phone:')).toBeInTheDocument();
        expect(screen.getByText('Family:')).toBeInTheDocument();
    });
});
