import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HostCalendar from '../hostdashboard/HostCalendar';
import { Auth } from 'aws-amplify';
jest.mock('aws-amplify');
jest.mock('../hostdashboard/Pages', () => () => <div>Pages Component</div>);
jest.mock('../hostdashboard/Calendar', () => () => <div>Calendar Component</div>);
jest.mock('../hostdashboard/PagesDropdown', () => () => <div>PagesDropdown Component</div>);

describe('HostDashboard', () => {
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch accommodations successfully when userId is set', async () => {
        const mockUserInfo = { attributes: { sub: 'test-user-id' } };
        const mockAccommodations = [{ ID: '1', Title: 'Test Accommodation' }];
        const mockFetchResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({ body: JSON.stringify(mockAccommodations) })
        };

        jest.spyOn(Auth, 'currentUserInfo').mockResolvedValue(mockUserInfo);
        global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);

        const { getByText, getByRole } = render(<HostCalendar />);

        await waitFor(() => expect(getByText('Calendar')).toBeInTheDocument());
        await waitFor(() => expect(getByRole('option', { name: 'Test Accommodation' })).toBeInTheDocument());

        Auth.currentUserInfo.mockRestore();
        global.fetch.mockRestore();
    });

    it('should display a list of accommodations in a dropdown', async () => {
        const mockAccommodations = [{ ID: '1', Title: 'Test Accommodation' }];
        const mockFetchResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({ body: JSON.stringify(mockAccommodations) })
        };

        global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);

        render(<HostCalendar />);

        await waitFor(() => {
            screen.debug();

            expect(screen.getByRole('option', { name: 'Test Accommodation' })).toBeInTheDocument();
        });

        global.fetch.mockRestore();
    });

})