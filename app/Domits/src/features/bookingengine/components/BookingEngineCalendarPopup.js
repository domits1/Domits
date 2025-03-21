import {Modal, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/BookingEngineStyles";
import React, {useCallback, useEffect, useState} from "react";
import {Calendar} from "react-native-calendars";
import {CalendarUtils} from "react-native-calendars/src/index";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const BookingEngineCalendarPopup = ({onClose, onConfirm, dateRanges, bookedDates, property}) => {
    const [markedDates, setMarkedDates] = useState({})
    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    const [initialDate, setInitialDate] = useState("2024-10-01")
    const [availableDates, setAvailableDates] = useState({})

    useEffect(() => {
        setAvailabilityRanges()
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
            setSelectedRange({endDate: selectedDate})
            setMarkedDates(newMarkedDates);
        } else if (lastSelectedDate) { // Reset to first date if last date has been selected.
            const newMarkedDates = {...availableDates};

            setFirstSelectedDate(selectedDate);
            setLastSelectedDate(null);
            newMarkedDates[selectedDate] = {selected: true, color: 'green'};

            setMarkedDates(newMarkedDates);
            setSelectedRange({startDate: selectedDate, endDate: null})
        } else { // Select first date.
            const newMarkedDates = {...availableDates};
            setFirstSelectedDate(selectedDate);
            newMarkedDates[selectedDate] = {selected: true, color: 'green'};

            setMarkedDates(newMarkedDates);
            setSelectedRange({startDate: selectedDate})
        }

    }, [firstSelectedDate, lastSelectedDate, availableDates]);

    const confirmSelection = () => {
        if (firstSelectedDate && lastSelectedDate) {
            onConfirm(firstSelectedDate, lastSelectedDate);
            onClose();
        } else {
            alert('Please select both start and end dates.');
        }
    };

    return (
        <Modal transparent={true} visible={true} animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.calendarModalContent}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}>
                        <MaterialIcons name="close" size={24} color="#333"/>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Select Dates</Text>
                    <Calendar
                        markingType="period"
                        minDate={initialDate.toString()} // Set min selectable date
                        maxDate={getDate(356 - 1)} // Set max selectable date to one year
                        current={initialDate.toString()}
                        onDayPress={onDayPress}
                        markedDates={markedDates}
                        disableAllTouchEventsForDisabledDays

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
                    <TouchableOpacity
                        onPress={confirmSelection}
                        style={styles.confirmButton}>
                        <Text style={styles.confirmButtonText}>Confirm Dates</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default BookingEngineCalendarPopup;