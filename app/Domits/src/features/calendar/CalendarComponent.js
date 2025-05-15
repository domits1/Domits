import { ToastAndroid, View } from 'react-native';
import { Calendar } from 'react-native-calendars/src/index';
import { styles } from '../../screens/propertyDetailsScreen/styles/propertyDetailsStyles';
import React, { useCallback, useEffect, useState } from 'react';
import LoadingScreen from '../../screens/loadingscreen/screens/LoadingScreen';
import BookingRepository from '../../services/availability/bookingRepository';
import ToastMessage from '../../components/ToastMessage';
import CalculateNumberOfNights from "../bookingengine/stripe/utils/CalculateNumberOfNights";
import TestBookingRepository from "../../services/availability/test/testBookingRepository";

/**
 * Calendar component for selecting booking dates
 *
 * @param {Object} props Component props
 * @param {string} props.firstDateSelected Initial start date
 * @param {Function} props.onFirstDateSelected Callback when start date is selected
 * @param {string} props.lastDateSelected Initial end date
 * @param {Function} props.onLastDateSelected Callback when end date is selected
 * @param {Object} props.property Property details
 * @param {boolean} props.clickEnabled Whether date selection is enabled
 */
const CalendarComponent = ({
                               firstDateSelected,
                               onFirstDateSelected,
                               lastDateSelected,
                               onLastDateSelected,
                               property,
                               clickEnabled = false
                           }) => {
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [markedDates, setMarkedDates] = useState({});
    const [loading, setLoading] = useState(true);
    const [reservedNightsThisYear, setReservedNightsThisYear] = useState(0);

    /**
     * Generate a range of dates between start and end dates
     *
     * @param {string} start Start date
     * @param {string} end End date
     * @returns {Array} Array of dates in ISO format
     */
    const generateDateRange = (start, end) => {
        if (!start || !end) return [];

        const dateArray = [];
        let currentDate = new Date(start);
        const endDate = new Date(end);

        while (currentDate <= endDate) {
            dateArray.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dateArray;
    };

    /**
     * Fetch reservation dates for a property
     *
     * @param {string} id Property ID
     * @param {Date} date Arrival date
     * @returns {Promise<Array>} Promise resolving to an array of reserved dates
     */
    const fetchReservationDates = useCallback(async (id, date) => {
        try {
            const repo =
                process.env.REACT_APP_TESTING === "true" ? new TestBookingRepository() : new BookingRepository();

            const response = await repo.getBookingsByPropertyIdAndFromDate(id, date);

            const reservedDates = response.map(data =>
                generateDateRange(data.arrivalDate, data.departureDate)
            );

            const reservedDatesThisYear = reservedDates.map(data => data.filter(reservedDate =>
                new Date(reservedDate).getFullYear() === new Date().getFullYear()
            ));

            const reservedNightsThisYearArray = reservedDatesThisYear.map(range =>
                range.length > 0 ? CalculateNumberOfNights(range[0], range[range.length - 1]) : 0
            );

            setReservedNightsThisYear(
                reservedNightsThisYearArray.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
            );

            return reservedDates.flat();
        } catch (error) {
            ToastMessage(error.message, ToastAndroid.LONG);
            return [];
        }
    }, []);

    /**
     * Get available dates from property availability
     *
     * @returns {Promise<Array>} Promise resolving to an array of available dates
     */
    const getAvailableDates = useCallback(() => {
        if (!property || !property.availability) return [];

        const availabilities = property.availability;
        return availabilities.flatMap(availability =>
            generateDateRange(
                availability.availableStartDate,
                availability.availableEndDate,
            )
        );
    }, [property]);

    /**
     * Calculate unavailable dates based on available dates
     *
     * @param {Array} availableDates Array of available dates
     * @returns {Promise<Array>} Promise resolving to an array of unavailable dates
     */
    const getUnavailableDates = useCallback((availableDates) => {
        const today = new Date();
        const availableArray = availableDates.map(date =>
            new Date(date).toISOString().split('T')[0]
        );

        const nonAvailableDates = [];
        for (let i = 0; i < 365; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            if (!availableArray.find(date => date === dateStr)) {
                nonAvailableDates.push(dateStr);
            }
        }

        return nonAvailableDates;
    }, []);

    /**
     * Check if a date range is valid (no unavailable dates in the range)
     *
     * @param {string} startDate Start date
     * @param {string} endDate End date
     * @param {Object} nonAvailableDates Object containing unavailable dates
     * @returns {boolean} True if range is valid
     */
    const isValidRange = (startDate, endDate, nonAvailableDates) => {
        return !generateDateRange(startDate, endDate).some(date => nonAvailableDates[date]);
    };

    /**
     * Handle updating marked dates in the calendar
     *
     * @param {Object} dates Dates to mark
     */
    const updateMarkedDates = useCallback((dates) => {
        setMarkedDates(dates);
    }, []);

    /**
     * Mark a range of dates as selected
     *
     * @param {Array} range Array of dates to mark
     * @param {Object} nonAvailableDates Object containing unavailable dates
     */
    const handleDateRangeSelection = useCallback((range, nonAvailableDates) => {
        const newMarkedDates = { ...nonAvailableDates };
        range.forEach(date => {
            newMarkedDates[date] = { selected: true, color: 'green' };
        });
        updateMarkedDates(newMarkedDates);
    }, []);

    /**
     * Get a date in the future
     *
     * @param {number} daysInTheFuture Number of days in the future
     * @returns {Date} Future date
     */
    const getFutureDate = (daysInTheFuture) => {
        const date = new Date();
        date.setDate(date.getDate() + daysInTheFuture);
        return date;
    };

    /**
     * Create an object with unavailable dates marked as disabled
     *
     * @returns {Object} Object with unavailable dates marked as disabled
     */
    const createNonAvailableDatesObject = useCallback(() => {
        return unavailableDates.reduce((obj, item) => {
            obj[item] = { disabled: true };
            return obj;
        }, {});
    }, [unavailableDates]);

    /**
     * Get the maximum allowed nights for booking based on restrictions
     *
     * @returns {number} Maximum allowed nights for booking
     */
    const getMaximumAllowedNights = useCallback(() => {
        if (!property || !property.availabilityRestrictions) return 365;

        const maxNightsRestriction = property.availabilityRestrictions
            .find(item => item.restriction === "MaximumNightsPerYear");

        if (!maxNightsRestriction) return 365;

        return maxNightsRestriction.value - reservedNightsThisYear;
    }, [property, reservedNightsThisYear]);

    /**
     * Find selected dates in the calendar
     *
     * @returns {Object} Object containing first and last selected dates
     */
    const findSelectedDates = useCallback(() => {
        const firstSelectedDate = Object.keys(markedDates).find(date => markedDates[date]?.selected);
        const lastSelectedDate = Object.keys(markedDates).find(date =>
            markedDates[date]?.selected && date !== firstSelectedDate
        );

        return { firstSelectedDate, lastSelectedDate };
    }, [markedDates]);

    /**
     * Handle first date selection
     *
     * @param {string} selectedDate Selected date
     * @param {number} maximumNightsThisYear Maximum allowed nights
     * @param {Object} nonAvailableDates Object with unavailable dates
     */
    const handleFirstDateSelection = useCallback((selectedDate, maximumNightsThisYear, nonAvailableDates) => {
        // Check if property can be rented due to restrictions
        const baseDate = new Date(selectedDate);
        const finalPossibleDate = new Date(baseDate);
        finalPossibleDate.setDate(baseDate.getDate() + maximumNightsThisYear);
        const possibleDateRange = generateDateRange(selectedDate, finalPossibleDate);

        if (possibleDateRange.length < 2) {
            ToastMessage(
                "This property can not receive any more reservations due to rental restrictions.",
                ToastAndroid.LONG
            );
            return;
        }

        updateMarkedDates({ ...nonAvailableDates, [selectedDate]: { selected: true, color: 'green' } });
        onFirstDateSelected(selectedDate);
    }, [updateMarkedDates, onFirstDateSelected]);

    /**
     * Handle selection when first date is already selected
     *
     * @param {string} selectedDate Selected date
     * @param {string} firstSelectedDate Previously selected first date
     * @param {number} maximumNightsThisYear Maximum allowed nights
     * @param {Object} nonAvailableDates Object with unavailable dates
     */
    const handleSecondDateSelection = useCallback((selectedDate, firstSelectedDate, maximumNightsThisYear, nonAvailableDates) => {
        const baseDate = new Date(firstSelectedDate);
        const finalPossibleDate = new Date(baseDate);
        finalPossibleDate.setDate(baseDate.getDate() + maximumNightsThisYear);
        const possibleDateRange = generateDateRange(firstSelectedDate, finalPossibleDate);

        if (new Date(selectedDate) <= new Date(firstSelectedDate) ||
            !isValidRange(firstSelectedDate, selectedDate, nonAvailableDates)) {
            // Selected date is before first date or range is invalid - reset selection
            updateMarkedDates({ ...nonAvailableDates, [selectedDate]: { selected: true, color: 'green' } });
            onFirstDateSelected(selectedDate);
            onLastDateSelected(null);
        } else {
            if (!possibleDateRange.includes(selectedDate)) {
                // Selected date is outside the maximumNightsPerYear range - reset selection and show toast message
                ToastMessage(
                    `Due to restrictions, this property may only be rented for ${maximumNightsThisYear} nights.`,
                    ToastAndroid.SHORT
                );
                const nonAvailableDates = createNonAvailableDatesObject();
                resetSelection(selectedDate, nonAvailableDates);
            } else {
                const dateRange = generateDateRange(firstSelectedDate, selectedDate);
                handleDateRangeSelection(dateRange, nonAvailableDates);
                onLastDateSelected(selectedDate);
            }
        }
    }, [updateMarkedDates, onFirstDateSelected, onLastDateSelected, isValidRange, handleDateRangeSelection]);

    /**
     * Reset selection when both dates are already selected
     *
     * @param {string} selectedDate New selected date
     * @param {Object} nonAvailableDates Object with unavailable dates
     */
    const resetSelection = useCallback((selectedDate, nonAvailableDates) => {
        updateMarkedDates({ ...nonAvailableDates, [selectedDate]: { selected: true, color: 'green' } });
        onFirstDateSelected(selectedDate);
        onLastDateSelected(null);
    }, [updateMarkedDates, onFirstDateSelected, onLastDateSelected]);

    /**
     * Handle date click in the calendar
     *
     * @param {Object} day Day object from calendar
     */
    const onDateClick = useCallback((day) => {
        const selectedDate = day.dateString;
        const nonAvailableDates = createNonAvailableDatesObject();
        const maximumNightsThisYear = getMaximumAllowedNights();

        if (nonAvailableDates[selectedDate]) return;
        // Don't allow selection of unavailable dates

        const { firstSelectedDate, lastSelectedDate } = findSelectedDates();

        if (firstSelectedDate && !lastSelectedDate) {
            // We have a start date but no end date yet
            handleSecondDateSelection(selectedDate, firstSelectedDate, maximumNightsThisYear, nonAvailableDates);
        } else if (lastSelectedDate) {
            // Both dates were already selected - reset and start new selection
            resetSelection(selectedDate, nonAvailableDates);
        } else {
            // First selection
            handleFirstDateSelection(selectedDate, maximumNightsThisYear, nonAvailableDates);
        }
    }, [
        createNonAvailableDatesObject,
        getMaximumAllowedNights,
        findSelectedDates,
        handleSecondDateSelection,
        resetSelection,
        handleFirstDateSelection
    ]);

    /**
     * Load unavailable dates and initialize calendar
     */
    useEffect(() => {
        async function initializeCalendar() {
            try {
                if (!property || !property.property) {
                    setLoading(false);
                    return;
                }

                // Get all unavailable dates
                const reservationDates = await fetchReservationDates(property.property.id, Date.now());
                const availableDates = getAvailableDates();
                const unAvailableDates = getUnavailableDates(availableDates);
                const allUnavailableDates = [...reservationDates, ...unAvailableDates];

                // Create marked dates object for calendar
                let dateMarks = {};
                allUnavailableDates.forEach(date => {
                    dateMarks[date] = { disabled: true };
                });

                // If date range is already selected, mark also the dates in that date range
                if (firstDateSelected && lastDateSelected) {
                    generateDateRange(firstDateSelected, lastDateSelected).forEach((date) => {
                        dateMarks[date] = { selected: true, color: 'green' };
                    });
                } else if (firstDateSelected) {
                    // If only start date is selected
                    dateMarks[firstDateSelected] = { selected: true, color: 'green' };
                }

                setMarkedDates(dateMarks);
                setUnavailableDates(allUnavailableDates);
                setLoading(false);
            } catch (error) {
                console.error('Error initializing calendar:', error);
                ToastMessage('Error loading calendar', ToastAndroid.LONG);
                setLoading(false);
            }
        }

        initializeCalendar();
    }, [
        fetchReservationDates,
        property,
        getUnavailableDates,
        getAvailableDates,
        firstDateSelected,
        lastDateSelected
    ]);

    const calendarTheme = {
        todayTextColor: 'green',
        arrowColor: 'green',
        stylesheet: {
            calendar: {
                header: {
                    week: {
                        marginTop: 30,
                        marginHorizontal: 12,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    },
                },
            },
        },
    };

    if (loading) {
        return <LoadingScreen loadingName={'calendar'} />;
    }

    return (
        <View>
            <Calendar
                testID={'calendar-list'}
                style={styles.calendar}
                minDate={getFutureDate(0).toISOString()}
                maxDate={getFutureDate(365).toISOString()}
                markingType={'period'}
                markedDates={markedDates}
                onDayPress={clickEnabled ? onDateClick : null}
                hideExtraDays
                theme={calendarTheme}
            />
        </View>
    );
};

export default CalendarComponent;