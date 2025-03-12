import {ActivityIndicator, View} from "react-native";
import {Calendar, CalendarUtils} from "react-native-calendars/src/index";
import {styles} from "../styles/propertyDetailsStyles";
import React, {useCallback, useEffect, useState} from "react";

const SelectBookingDateCalendar = ({onFirstDateSelected, onLastDateSelected, property}) => {
    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    const [markedDates, setMarkedDates] = useState({})
    const [initialDate, setInitialDate] = useState({})
    const [availableDates, setAvailableDates] = useState({})
    const [calendarLoading, setCalendarLoading] = useState(true)

    const getCurrentDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    useEffect(() => {
        //fixme: available booking dates of properties are currently only in the past.
        // setInitialDate(getCurrentDate)
        setInitialDate("2024-10-01")

        // Load calendar
        setAvailabilityRanges()
        setCalendarLoading(false)

    }, [initialDate, property])

    /**
     * Set which dates are available for booking a year in advance from the initial date.
     */
    const setAvailabilityRanges = () => {
        const dateRanges = property.DateRanges || [];
        let dates = new Set();

        const startDate = initialDate;
        const endDate = getDate(356); // Track available dates a year in advance
        const allDates = generateDateRange(startDate, endDate);

        // Mark all dates as disabled by default
        const newMarkedDates = {};
        allDates.forEach(date => {
            newMarkedDates[date] = {disabled: true, disableTouchEvent: true};
        });

        // Add and mark available dates
        dateRanges.forEach(range => {
            const startDate = new Date(range.startDate);
            const endDate = new Date(range.endDate);
            const rangeDates = generateDateRange(startDate, endDate);

            rangeDates.forEach(date => {
                dates.add(date);
                newMarkedDates[date] = {disabled: false, disableTouchEvent: false}; // Mark available dates as active
            });
        });

        setAvailableDates(newMarkedDates);
        setMarkedDates(newMarkedDates);
    };

    /**
     * Generate an array of dates from a given start and end date.
     * @param start - Start date.
     * @param end - End date.
     * @returns {*[]} - Array of dates with the format "yyyy-mm-dd".
     */
    const generateDateRange = (start, end) => {
        const dateArray = [];
        let currentDate = new Date(start);

        while (currentDate <= new Date(end)) {
            dateArray.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dateArray
    }

    /**
     * Get the date with a given amount of days from the initial date.
     * @param count - amount of day increments.
     * @returns {any} - Date with the format "yyyy-mm-dd".
     */
    const getDate = (count) => {
        const date = new Date(initialDate);
        const newDate = date.setDate(date.getDate() + count);
        return CalendarUtils.getCalendarDateString(newDate);
    };

    /**
     * Handle pressing a date and update the selected date range.
     */
    const onDayPress = useCallback((day) => {
        const selectedDate = day.dateString

        if (!lastSelectedDate && firstSelectedDate && new Date(selectedDate) > new Date(firstSelectedDate)) { // Select first date.
            const dateRange = generateDateRange(firstSelectedDate, selectedDate);
            const newMarkedDates = {...markedDates};

            // Mark the dates in the range
            dateRange.forEach(date => {
                newMarkedDates[date] = {selected: true, color: 'green'};
            });

            setLastSelectedDate(selectedDate);
            setMarkedDates(newMarkedDates);
            onLastDateSelected(selectedDate);
        } else if (lastSelectedDate) { // Reset to first date if last date has been selected.
            const newMarkedDates = {...availableDates};

            setFirstSelectedDate(selectedDate);
            setLastSelectedDate(null);
            newMarkedDates[selectedDate] = {selected: true, color: 'green'};

            setMarkedDates(newMarkedDates);
            onFirstDateSelected(selectedDate);
            onLastDateSelected(null);
        } else { // Select first date.
            const newMarkedDates = {...availableDates};
            setFirstSelectedDate(selectedDate);
            newMarkedDates[selectedDate] = {selected: true, color: 'green'};

            setMarkedDates(newMarkedDates);
            onFirstDateSelected(selectedDate)
        }

    }, [firstSelectedDate, lastSelectedDate, availableDates]);

    // Loading view for calendar
    if (calendarLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff"/>
            </View>
        );
    }

    return (
        <View>
            <Calendar
                style={styles.calendar}
                minDate={initialDate.toString()} // Set min selectable date
                maxDate={getDate(356 - 1)} // Set max selectable date to one year
                current={initialDate.toString()}
                onDayPress={onDayPress}
                markedDates={markedDates}
                markingType={"period"}
                disableAllTouchEventsForDisabledDays
                hideExtraDays

                theme={{
                    todayTextColor: 'green',
                    arrowColor: 'green',
                    stylesheet: {
                        calendar: {
                            header: {
                                week: {
                                    marginTop: 30,
                                    marginHorizontal: 12,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between'
                                }
                            }
                        }
                    }
                }}
            />
        </View>
    )
}

export default SelectBookingDateCalendar;