import {Modal, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/BookingEngineStyles";
import React, {useCallback, useEffect, useState} from "react";
import DateFormatterYYYY_MM_DD from "../../../screens/utils/DateFormatterYYYY_MM_DD";
import {Calendar} from "react-native-calendars";
import {CalendarUtils} from "react-native-calendars/src/index";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const BookingEngineCalendarPopup = ({onClose, onConfirm, dateRanges, bookedDates, property}) => {

    const today = DateFormatterYYYY_MM_DD(new Date());
    const [selectedRange, setSelectedRange] = useState({
        startDate: '',
        endDate: '',
    });

    const maxDateObj = new Date(
        Math.max(...dateRanges.map(range => new Date(range.endDate))),
    );
    const maxDateStr = DateFormatterYYYY_MM_DD(maxDateObj);
    const minDate = today;

    const filterBookedDates = date => {
        const selectedDate = DateFormatterYYYY_MM_DD(new Date(date));
        return bookedDates.some(bookedRange => {
            const start = DateFormatterYYYY_MM_DD(new Date(bookedRange[0]));
            const end = DateFormatterYYYY_MM_DD(new Date(bookedRange[1]));
            return selectedDate >= start && selectedDate <= end;
        });
    };

    const filterDisabledDays = date => {
        const selectedDate = DateFormatterYYYY_MM_DD(new Date(date));
        return !dateRanges.some(range => {
            const start = DateFormatterYYYY_MM_DD(new Date(range.startDate));
            const end = DateFormatterYYYY_MM_DD(new Date(range.endDate));
            return selectedDate >= start && selectedDate <= end;
        });
    };

    const combinedDateFilter = date => {
        const selectedDate = DateFormatterYYYY_MM_DD(new Date(date));
        const isInThePast = selectedDate < today;
        const isOutsideAvailableRange = filterDisabledDays(selectedDate);
        const isBooked = filterBookedDates(selectedDate);

        return !(isOutsideAvailableRange || isBooked || isInThePast);
    };

    const [currentDateRange, setCurrentDateRange] = useState({});

    const [markedDates, setMarkedDates] = useState({})

    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    // const [initialDate, setInitialDate] = useState({})
    const [initialDate, setInitialDate] = useState("2024-10-01")
    const [availableDates, setAvailableDates] = useState({})
    const [loading, setLoading] = useState(true)

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


    //todo
    const onDayPress1 = day => {
        const selectedDate = day.dateString;
        // if (!combinedDateFilter(selectedDate)) {
        //     alert('This date is unavailable.');
        //     return;
        // }

        if (!selectedRange.startDate) {
            const selectedRange = dateRanges.find(range => {
                const start = DateFormatterYYYY_MM_DD(new Date(range.startDate));
                const end = DateFormatterYYYY_MM_DD(new Date(range.endDate));
                return selectedDate >= start && selectedDate <= end;
            });

            if (selectedRange) {
                setSelectedRange({startDate: selectedDate});
                setCurrentDateRange(selectedRange);
            }
        } else if (!selectedRange.endDate) {
            const selectedEndDate = DateFormatterYYYY_MM_DD(new Date(selectedDate));
            const rangeStart = DateFormatterYYYY_MM_DD(
                new Date(currentDateRange.startDate),
            );
            const rangeEnd = DateFormatterYYYY_MM_DD(
                new Date(currentDateRange.endDate),
            );

            if (selectedEndDate >= rangeStart && selectedEndDate <= rangeEnd) {
                const startDate = new Date(selectedRange.startDate);
                const endDate = new Date(selectedDate);

                const isOverlap = bookedDates.some(bookedRange => {
                    const bookedStart = new Date(bookedRange[0]);
                    const bookedEnd = new Date(bookedRange[1]);
                    return startDate <= bookedEnd && endDate >= bookedStart;
                });

                if (isOverlap) {
                    alert(
                        'The selected date range includes booked dates. Please choose another range.',
                    );
                    setSelectedRange({startDate: '', endDate: ''});
                    return;
                }

                setSelectedRange({...selectedRange, endDate: selectedDate});
            } else {
                alert('Please select an end date within the same range.');
            }
        } else {
            setSelectedRange({startDate: selectedDate});
            const selectedRange = dateRanges.find(range => {
                const start = DateFormatterYYYY_MM_DD(new Date(range.startDate));
                const end = DateFormatterYYYY_MM_DD(new Date(range.endDate));
                return selectedDate >= start && selectedDate <= end;
            });
            setCurrentDateRange(selectedRange);
        }
    };

    const getDatesInRange = (start, end) => {
        const dates = {};
        let currentDate = new Date(start);
        const endDate = new Date(end);

        while (currentDate <= endDate) {
            const dateString = DateFormatterYYYY_MM_DD(currentDate);
            dates[dateString] = {color: '#4CAF50', textColor: 'white'};
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    };

    const getUnavailableDates = () => {
        const unavailableDates = {};

        const markDisabledDate = date => {
            const dateString = DateFormatterYYYY_MM_DD(new Date(date));
            unavailableDates[dateString] = {
                disabled: true,
                disableTouchEvent: true,
                textColor: '#a9a9a9',
            };
        };

        const earliestStart = new Date(dateRanges[0].startDate);
        let currentDate = new Date(today);
        while (currentDate <= maxDateObj) {
            if (
                !dateRanges.some(range => {
                    const start = new Date(range.startDate);
                    const end = new Date(range.endDate);
                    return currentDate >= start && currentDate <= end;
                })
            ) {
                markDisabledDate(currentDate);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        bookedDates.forEach(bookedRange => {
            let start = new Date(bookedRange[0]);
            const end = new Date(bookedRange[1]);
            while (start <= end) {
                markDisabledDate(start);
                start.setDate(start.getDate() + 1);
            }
        });

        currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() - 1);
        while (currentDate >= earliestStart) {
            markDisabledDate(currentDate);
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return unavailableDates;
    };

    const unavailableDates = getUnavailableDates();

    // const markedDates = {
    //     ...unavailableDates,
    //     ...(selectedRange.startDate && selectedRange.endDate
    //         ? getDatesInRange(selectedRange.startDate, selectedRange.endDate)
    //         : {}),
    //     [selectedRange.startDate]: {
    //         startingDay: true,
    //         color: '#4CAF50',
    //         textColor: 'white',
    //     },
    //     [selectedRange.endDate]: {
    //         endingDay: true,
    //         color: '#4CAF50',
    //         textColor: 'white',
    //     },
    // };

    const confirmSelection = () => {
        if (firstSelectedDate && lastSelectedDate) {
            // onFirstDateSelected(firstSelectedDate)
            // onLastDateSelected(lastSelectedDate)

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