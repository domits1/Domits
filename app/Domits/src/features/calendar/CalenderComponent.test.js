import React from 'react';
import {render, fireEvent, waitFor, screen} from '@testing-library/react-native';
import CalendarComponent from './CalendarComponent';
import LoadingScreen from '../../screens/loadingscreen/screens/LoadingScreen';
import {beforeEach, describe, expect, it} from "@jest/globals";

jest.mock('@aws-amplify/core', () => ({
    fetchAuthSession: jest.fn()
}))

jest.mock('../../screens/loadingscreen/screens/LoadingScreen', () => {
    return jest.fn(() => {
        return <></>;
    });
});

describe('CalendarComponent', () => {
    function getFutureDate(daysInTheFuture) {
        const date = new Date();
        date.setDate(date.getDate() + daysInTheFuture);
        return date;
    }

    const mockFirstDateSelected = jest.fn();
    const mockLastDateSelected = jest.fn();

    const property = {
        property: {
            id: "test"
        },
        availability: [
            {
                availableStartDate: getFutureDate(1).getTime(),
                availableEndDate: getFutureDate(15).getTime(),
            },
        ],
        availabilityRestrictions: [
            {restriction: "MaximumNightsPerYear", value: 10},
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows LoadingScreen initially', () => {
        render(
            <CalendarComponent
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
                clickEnabled={true}
            />
        );

        expect(LoadingScreen).toHaveBeenCalled();
    });

    it('renders the Calendar after loading', async () => {
        render(
            <CalendarComponent
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
                clickEnabled={true}
            />
        );

        await waitFor(expect(() => screen.findByTestId('calendar-list')).toBeTruthy);
    });

    it('handles selecting the next two days, considering month change', async () => {
        render(
            <CalendarComponent
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
                clickEnabled={true}
            />
        );

        await waitFor(expect(() => screen.findByTestId('calendar-list')).toBeTruthy);

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const twoDaysLater = new Date(today);
        twoDaysLater.setDate(today.getDate() + 2);

        if (today.getDate() === new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()) {
            const nextMonthButton = await screen.findByTestId('calendar-list.header.rightArrow');
            fireEvent.press(nextMonthButton);
        }

        const nextDay = await screen.findByText(tomorrow.getDate().toString());
        fireEvent.press(nextDay);
        expect(mockFirstDateSelected).toHaveBeenCalledWith(tomorrow.toISOString().split('T')[0]);

        const nextDayAfter = await screen.findByText(twoDaysLater.getDate().toString());
        fireEvent.press(nextDayAfter);
        expect(mockLastDateSelected).toHaveBeenCalledWith(twoDaysLater.toISOString().split('T')[0]);
    });

    it('does not allow selecting unavailable dates', async () => {
        render(
            <CalendarComponent
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
                clickEnabled={true}
            />
        );

        const calendar = await waitFor(() => screen.findByTestId('calendar-list'));

        const farFutureDate = new Date();
        farFutureDate.setDate(farFutureDate.getDate() + 300);

        fireEvent(calendar, 'dayPress', {dateString: farFutureDate.toISOString().split('T')[0]});

        expect(mockFirstDateSelected).not.toHaveBeenCalled();
        expect(mockLastDateSelected).not.toHaveBeenCalled();
    });

    it('does not allow selecting dates that would exceed the MaximumNightsPerYear restriction', async () => {
        render(
            <CalendarComponent
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
                clickEnabled={true}
            />
        );

        const calendar = await waitFor(() => screen.findByTestId('calendar-list'));

        const firstFutureDate = getFutureDate(11);
        fireEvent(calendar, 'dayPress', {dateString: firstFutureDate.toISOString().split('T')[0]});

        const secondFutureDate = getFutureDate(18)
        fireEvent(calendar, 'dayPress', {dateString: secondFutureDate.toISOString().split('T')[0]});

        expect(mockFirstDateSelected).toHaveBeenCalled();
        expect(mockLastDateSelected).not.toHaveBeenCalled();
    });

    it('resets selection if user selects a new start date after finishing a range', async () => {
        render(
            <CalendarComponent
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
                clickEnabled={true}
            />
        );

        const calendar = await waitFor(() => screen.findByTestId('calendar-list'));

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const twoDaysLater = new Date(today);
        twoDaysLater.setDate(today.getDate() + 2);

        fireEvent(calendar, 'dayPress', {dateString: tomorrow.toISOString().split('T')[0]});
        fireEvent(calendar, 'dayPress', {dateString: twoDaysLater.toISOString().split('T')[0]});

        expect(mockFirstDateSelected).toHaveBeenCalledTimes(1);
        expect(mockLastDateSelected).toHaveBeenCalledTimes(1);

        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);

        fireEvent(calendar, 'dayPress', {dateString: threeDaysLater.toISOString().split('T')[0]});

        expect(mockFirstDateSelected).toHaveBeenCalledTimes(2);
        expect(mockLastDateSelected).toHaveBeenCalledWith(null);
    });
});
