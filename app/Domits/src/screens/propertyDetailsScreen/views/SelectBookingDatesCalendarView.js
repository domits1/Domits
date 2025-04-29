import {View} from "react-native";
import {Calendar} from "react-native-calendars/src/index";
import {styles} from "../styles/propertyDetailsStyles";
import React, {useCallback, useEffect, useState} from "react";
import LoadingScreen from "../../loadingscreen/screens/LoadingScreen";

const SelectBookingDatesCalendarView = ({onFirstDateSelected, onLastDateSelected, property}) => {
    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    const [markedDates, setMarkedDates] = useState({});
    const [calendarLoading, setCalendarLoading] = useState(true);

    const getFutureDate = daysInTheFuture => {
        const date = new Date();
        date.setDate(date.getDate() + daysInTheFuture);
        return date;
    };

    useEffect(() => {
        setMarkedDates(getUnavailableDates());
        setCalendarLoading(false);
    }, []);

    const onDateClick = useCallback(day => {
        const selectedDate = day.dateString;
        const unavailableDates = getUnavailableDates();

        if (unavailableDates[selectedDate]) {
            return;
        }

        if (firstSelectedDate && !lastSelectedDate) {
            const dateRange = generateDateRange(firstSelectedDate, selectedDate);
            for (let date of dateRange) {
                if (unavailableDates[date]) {
                    return;
                }
            }
        }

        if (!lastSelectedDate && firstSelectedDate && new Date(selectedDate) > new Date(firstSelectedDate)) {
            const dateRange = generateDateRange(firstSelectedDate, selectedDate);
            const newMarkedDates = {...markedDates};

            dateRange.forEach(date => {
                newMarkedDates[date] = {selected: true, color: 'green'};
            });

            setLastSelectedDate(selectedDate);
            onLastDateSelected(selectedDate);
            setMarkedDates(newMarkedDates);
        } else if (lastSelectedDate) {
            const newMarkedDates = {...unavailableDates};

            setFirstSelectedDate(selectedDate);
            onFirstDateSelected(selectedDate);
            setLastSelectedDate(null);
            onLastDateSelected(null);
            newMarkedDates[selectedDate] = {selected: true, color: 'green'};

            setMarkedDates(newMarkedDates);
        } else {
            const newMarkedDates = {...unavailableDates};
            setFirstSelectedDate(selectedDate);
            onFirstDateSelected(selectedDate)

            newMarkedDates[selectedDate] = {selected: true, color: 'green'};
            setMarkedDates(newMarkedDates);
        }

    }, [firstSelectedDate, lastSelectedDate]);

    const generateDateRange = (start, end) => {
        const dateArray = [];
        let currentDate = new Date(start);

        while (currentDate <= new Date(end)) {
            dateArray.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dateArray
    }

    const getUnavailableDates = () => {
        const availabilities = property.availability;
        const availableDates = [];
        const today = new Date();

        availabilities.forEach(availability => {
            const startDate = new Date(availability.availableStartDate);
            const endDate = new Date(availability.availableEndDate);
            let current = new Date(startDate);

            while (current <= endDate) {
                const dateStr = current.toISOString().split('T')[0];
                availableDates.push(dateStr);
                current.setDate(current.getDate() + 1);
            }
        });

        const unavailableDates = {};
        for (let i = 0; i < 365; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            if (!availableDates.includes(dateStr)) {
                unavailableDates[dateStr] = {disabled: true};
            }
        }
        return unavailableDates;
    }

    if (calendarLoading) {
        return <LoadingScreen loadingName={"calendar"}/>
    } else {
        return (
            <View>
                <Calendar
                    testID={"calendar-list"}
                    style={styles.calendar}
                    minDate={getFutureDate(0).toISOString()}
                    maxDate={getFutureDate(365).toISOString()}
                    markingType={"period"}
                    markedDates={markedDates}
                    onDayPress={onDateClick}
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
}

export default SelectBookingDatesCalendarView;