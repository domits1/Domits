import React from 'react';
import {render, fireEvent, waitFor, screen} from '@testing-library/react-native';
import SelectBookingDatesCalendarView from '../views/SelectBookingDatesCalendarView';
import LoadingScreen from '../../loadingscreen/screens/LoadingScreen';
import {beforeEach, describe, expect, it} from "@jest/globals";

jest.mock('../../loadingscreen/screens/LoadingScreen', () => {
    return jest.fn(() => {
        return <></>;
    });
});

describe('SelectBookingDatesCalendarView', () => {
    const mockFirstDateSelected = jest.fn();
    const mockLastDateSelected = jest.fn();

    const property = {
        availability: [
            {
                availableStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).getTime(),
                availableEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).getTime(),
            },
        ],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows LoadingScreen initially', () => {
        render(
            <SelectBookingDatesCalendarView
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
            />
        );

        expect(LoadingScreen).toHaveBeenCalled();
    });

    it('renders the Calendar after loading', async () => {
        render(
            <SelectBookingDatesCalendarView
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
            />
        );

        const calendar = await waitFor(() => screen.findByTestId('calendar-list'));
        expect(calendar).toBeTruthy();
    });

    it('handles selecting the next two days, considering month change', async () => {
        render(
            <SelectBookingDatesCalendarView
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
            />
        );

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
            <SelectBookingDatesCalendarView
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
            />
        );

        const calendar = await waitFor(() => screen.findByTestId('calendar-list'));

        const farFutureDate = new Date();
        farFutureDate.setDate(farFutureDate.getDate() + 300);

        fireEvent(calendar, 'dayPress', {dateString: farFutureDate.toISOString().split('T')[0]});

        expect(mockFirstDateSelected).not.toHaveBeenCalled();
        expect(mockLastDateSelected).not.toHaveBeenCalled();
    });

    it('resets selection if user selects a new start date after finishing a range', async () => {
        render(
            <SelectBookingDatesCalendarView
                onFirstDateSelected={mockFirstDateSelected}
                onLastDateSelected={mockLastDateSelected}
                property={property}
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
