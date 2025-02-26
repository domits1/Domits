import {View} from "react-native";
import {Calendar, CalendarUtils} from "react-native-calendars/src/index";
import {styles} from "../styles/listingDetailStyles";
import React, {useCallback, useEffect, useState} from "react";

const SelectBookingDateCalendar = ({onFirstDateSelected, onLastDateSelected, property}) => {
    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    const [markedDates, setMarkedDates] = useState({})
    const [initialDate, setInitialDate] = useState({})
    const [availabilityStartDate, setAvailabilityStartDate] = useState({})
    const [availabilityEndDate, setAvailabilityEndDate] = useState({})

    const getCurrentDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    useEffect(() => {
        setInitialDate(getCurrentDate)

        // Set availability to first availability date range of the property
        const availabilityStartDateFromProperty = new Date(property.DateRanges[0].startDate)
        const availabilityEndDateFromProperty = new Date(property.DateRanges[0].endDate)
        setAvailabilityStartDate(availabilityStartDateFromProperty)
        setAvailabilityEndDate(availabilityEndDateFromProperty)

    }, [initialDate, property])

    // Helper test function for setting selectable dates. Can be removed later.
    const getDate = (count) => {
        const date = new Date(initialDate);
        const newDate = date.setDate(date.getDate() + count);
        return CalendarUtils.getCalendarDateString(newDate);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    /**
     * Handle pressing a date and update the selected date range.
     */
    const onDayPress = useCallback((day) => {
        const selectedDate = day.dateString

        if (!lastSelectedDate && firstSelectedDate && new Date(selectedDate) > new Date(firstSelectedDate)) {
            setLastSelectedDate(selectedDate);
            const newMarkedDates = getDatesRange(firstSelectedDate, selectedDate);
            setMarkedDates(newMarkedDates);
            onLastDateSelected(selectedDate)
        } else if (lastSelectedDate) {
            setFirstSelectedDate(selectedDate);
            setLastSelectedDate(null);
            setMarkedDates({
                [selectedDate]: {selected: true, color: 'green'},
            });
            onFirstDateSelected(selectedDate)
            onLastDateSelected(null)
        } else {
            setFirstSelectedDate(selectedDate);
            setMarkedDates({
                [selectedDate]: {selected: true, color: 'green'},
            });
            onFirstDateSelected(selectedDate)
        }

    }, [firstSelectedDate, lastSelectedDate]);

    /**
     * Generate a list of the dates between the chosen start and end.
     * @param start - Starting date of the period.
     * @param end - End date of the period.
     * @returns {{}} - List of the dates.
     */
    const getDatesRange = (start, end) => {
        const range = {};
        let currentDate = new Date(start);

        while (currentDate <= new Date(end)) {
            const dateString = currentDate.toISOString().split('T')[0];
            range[dateString] = {selected: true, color: 'green'};
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return range;
    };

    return (
        <View>
            <Calendar
                style={styles.calendar}
                minDate={availabilityStartDate.toString()}
                maxDate={availabilityEndDate.toString()}
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