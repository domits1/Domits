import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import StripePayment from '../screens/StripePayment';
import {STRIPE_PAYMENT_CONFIRMED_SCREEN} from '../../../../navigation/utils/NavigationNameConstants';
import {beforeEach, describe, expect, it} from "@jest/globals";
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {LanguageReferences} from "../../../translation/services/Languages";

jest.mock('@stripe/stripe-react-native', () => ({
    useStripe: () => ({
        initPaymentSheet: jest.fn().mockResolvedValue({}),
        presentPaymentSheet: jest.fn().mockResolvedValue({}),
    }),
}));

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

const mockProperty = {
    images: [{ key: 'test-image.jpg' }],
    pricing: { roomRate: 100, cleaning: 10, service: 15 },
    generalDetails: [{ detail: 'Guests', value: 4 }],
    location: { city: 'Test City' },
    property: { description: 'Test Property' }
};

const mockRoute = {
    params: {
        property: mockProperty,
        arrivalDate: '2025-05-15',
        departureDate: '2025-05-17',
    },
};

describe('StripePayment screen', () => {
    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
        });
        jest.clearAllMocks();
    });

    it('renders core UI elements', async () => {
        const screen = render(<StripePayment navigation={mockNavigation} route={mockRoute} />);

        expect(screen.getByText('Confirm & Pay')).toBeTruthy();
    });

    it('opens guest and calendar modals when buttons are pressed', async () => {
        const screen = render(<StripePayment navigation={mockNavigation} route={mockRoute} />);

        fireEvent.press(screen.getAllByText('Change')[0]); // Guests
        expect(screen.getAllByText('Guests')[0]).toBeTruthy();

        fireEvent.press(screen.getAllByText('Change')[1]); // Dates
        expect(screen.getByText('calendar')).toBeTruthy();
    });

    it('navigates to confirmation screen on successful payment', async () => {
        const screen = render(<StripePayment navigation={mockNavigation} route={mockRoute} />);

        fireEvent.press(screen.getByText('Confirm & Pay'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(STRIPE_PAYMENT_CONFIRMED_SCREEN, expect.any(Object));
        });
    });
});
