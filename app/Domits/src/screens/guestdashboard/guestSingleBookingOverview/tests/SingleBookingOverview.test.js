import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import PropertyView from '../views/PropertyView';
import BookingDetailsView from '../views/BookingView';
import PropertyAmenities from '../components/PropertyAmenities';
import PropertyImage from '../components/PropertyImage';
import PropertyLocation from '../components/PropertyLocation';
import { S3URL } from '../../../../store/constants';
import {beforeEach, describe, expect, it} from "@jest/globals";
import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import {LanguageReferences} from "../../../../features/translation/services/Languages";

describe('PropertyView Component', () => {
    const mockProperty = {
        images: [{ key: 'test-image-key' }],
        location: {
            city: 'Test City',
            country: 'Test Country',
            street: 'Test Street',
            houseNumber: '123',
        },
        property: {
            title: 'Test Property',
            description: 'This is a test property description',
        },
        amenities: ['WiFi', 'Kitchen', 'Pool'],
    };

    const mockBooking = {
        status: { S: 'Awaiting Payment' },
        arrivalDate: { N: '1750636800000' },
        departureDate: { N: '1750982400000' },
    };

    it('renders correctly with all subcomponents', () => {
        const { getByText, UNSAFE_getAllByType } = render(
            <PropertyView property={mockProperty} booking={mockBooking} />
        );

        expect(UNSAFE_getAllByType(PropertyImage)).toHaveLength(1);
        expect(UNSAFE_getAllByType(PropertyLocation)).toHaveLength(1);
        expect(UNSAFE_getAllByType(PropertyAmenities)).toHaveLength(1);
        expect(UNSAFE_getAllByType(BookingDetailsView)).toHaveLength(1);
        expect(getByText('This is a test property description')).toBeTruthy();
    });

    it('passes the correct props to child components', () => {
        const { UNSAFE_getByType } = render(
            <PropertyView property={mockProperty} booking={mockBooking} />
        );

        const propertyImage = UNSAFE_getByType(PropertyImage);
        expect(propertyImage.props.imageKey).toBe('test-image-key');

        const propertyLocation = UNSAFE_getByType(PropertyLocation);
        expect(propertyLocation.props.location).toBe(mockProperty.location);

        const propertyAmenities = UNSAFE_getByType(PropertyAmenities);
        expect(propertyAmenities.props.amenities).toBe(mockProperty.amenities);

        const bookingDetailsView = UNSAFE_getByType(BookingDetailsView);
        expect(bookingDetailsView.props.booking).toBe(mockBooking);
    });
});

describe('BookingDetailsView Component', () => {
    const mockBooking = {
        status: { S: 'Awaiting Payment' },
        arrivalDate: { N: '1750636800000' },
        departureDate: { N: '1750982400000' },
    };

    it('renders booking information correctly', () => {
        const { getByText } = render(<BookingDetailsView booking={mockBooking} />);

        expect(getByText('Booking')).toBeTruthy();
        expect(getByText('Status: Awaiting Payment')).toBeTruthy();

        const arrivalDate = new Date(parseFloat(mockBooking.arrivalDate.N)).toISOString().split('T')[0];
        const departureDate = new Date(parseFloat(mockBooking.departureDate.N)).toISOString().split('T')[0];
        expect(getByText(`Period: ${arrivalDate} - ${departureDate}`)).toBeTruthy();
    });
});

describe('PropertyAmenities Component', () => {
    beforeEach(async () => {
        await i18n.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources: LanguageReferences,
            interpolation: {
                escapeValue: false
            }
        });
    });

    const mockAmenities = [
        {
            "id": "123",
            "property_id": "123",
            "amenityId": "6"
        },
        {
            "id": "123",
            "property_id": "123",
            "amenityId": "3"
        }
    ];

    it('renders show amenities button', () => {
        const { getByText } = render(<PropertyAmenities amenities={mockAmenities} />);
        expect(getByText('Show amenities')).toBeTruthy();
    });

    it('toggles amenities popup on button press', async () => {
        const { getByText, queryByTestId } = render(
            <PropertyAmenities amenities={mockAmenities} />
        );

        expect(queryByTestId('amenities-popup')).toBeNull();

        fireEvent.press(getByText('Show amenities'));

        await waitFor(() => {
            expect(queryByTestId('amenities-popup')).toBeTruthy();
        });

        const amenitiesPopup = queryByTestId('amenities-popup');
        expect(amenitiesPopup).toBeTruthy();

        const closeButton = queryByTestId('close-button');
        fireEvent.press(closeButton);

        await waitFor(() => {
            expect(queryByTestId('amenities-popup')).toBeNull();
        });
    });
});

describe('PropertyImage Component', () => {
    it('renders the image with the correct source URL', () => {
        const imageKey = 'test-image-key';
        const { UNSAFE_getByType } = render(<PropertyImage imageKey={imageKey} />);

        const image = UNSAFE_getByType('Image');
        expect(image.props.source).toEqual({ uri: `${S3URL}${imageKey}` });
    });
});

describe('PropertyLocation Component', () => {
    it('renders location information correctly with street', () => {
        const mockLocation = {
            city: 'Test City',
            country: 'Test Country',
            street: 'Test Street',
            houseNumber: '123',
        };

        const { getByText } = render(<PropertyLocation location={mockLocation} />);

        expect(getByText('Test City, Test Country')).toBeTruthy();
        expect(getByText('Test Street 123')).toBeTruthy();
    });

    it('renders location information correctly without street', () => {
        const mockLocation = {
            city: 'Test City',
            country: 'Test Country',
        };

        const { getByText, queryByText } = render(<PropertyLocation location={mockLocation} />);

        expect(getByText('Test City, Test Country')).toBeTruthy();
        expect(queryByText('Test Street 123')).toBeNull();
    });
});