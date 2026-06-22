// BookingOverview.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import BookingOverview, {
    BOOKINGS_ENDPOINT,
    buildBookingPostRequest,
    buildBookingRequestEvent,
    getBookingErrorMessage,
    normalizeBookingDateForRequest,
    parseBookingResponseBody,
} from '../BookingOverview';

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

describe('BookingOverview booking request payload', () => {
    test('keeps YYYY-MM-DD booking dates intact for backend parsing', () => {
        expect(normalizeBookingDateForRequest('2026-06-15')).toBe('2026-06-15');
        expect(normalizeBookingDateForRequest('2026-06-17')).toBe('2026-06-17');
    });

    test('builds booking request without parsing date strings into years', () => {
        const payload = buildBookingRequestEvent({
            propertyId: 'property-1',
            userName: 'Guest',
            bookingDetails: {
                guests: '2',
                checkInDate: '2026-06-15',
                checkOutDate: '2026-06-17',
            },
        });

        expect(payload).toEqual({
            identifiers: {
                property_Id: 'property-1',
            },
            general: {
                guests: 2,
                latePayment: false,
                arrivalDate: '2026-06-15',
                departureDate: '2026-06-17',
                guestName: 'Guest',
            },
        });
    });

    test('sends full YYYY-MM-DD dates in the POST /bookings request body', () => {
        const event = buildBookingRequestEvent({
            propertyId: 'property-1',
            userName: 'Guest',
            bookingDetails: {
                guests: '2',
                checkInDate: '2026-06-15',
                checkOutDate: '2026-06-17',
            },
        });

        const request = buildBookingPostRequest({ event, authToken: 'Bearer token' });
        const body = JSON.parse(request.options.body);

        expect(request.url).toBe(BOOKINGS_ENDPOINT);
        expect(request.url).toContain('/bookings');
        expect(body.general.arrivalDate).toBe('2026-06-15');
        expect(body.general.departureDate).toBe('2026-06-17');
        expect(body.general.arrivaldate).toBeUndefined();
        expect(body.general.departuredate).toBeUndefined();
        expect(body.general.checkIn).toBeUndefined();
        expect(body.general.checkOut).toBeUndefined();
    });

    test('parses an empty error response body safely', async () => {
        const response = {
            status: 500,
            text: jest.fn().mockResolvedValue(''),
        };

        const body = await parseBookingResponseBody(response);

        expect(body).toBeNull();
        expect(getBookingErrorMessage(response, body)).toBe('HTTP error! Status: 500');
    });

    test('uses backend error messages from non-empty response bodies', async () => {
        const response = {
            status: 400,
            text: jest.fn().mockResolvedValue(JSON.stringify({ message: 'arrivalDate is invalid.' })),
        };

        const body = await parseBookingResponseBody(response);

        expect(body).toEqual({ message: 'arrivalDate is invalid.' });
        expect(getBookingErrorMessage(response, body)).toBe('arrivalDate is invalid.');
    });
});

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
