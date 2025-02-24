import {View} from "react-native";
import {Calendar, CalendarUtils} from "react-native-calendars/src/index";
import {styles} from "../styles/listingDetailStyles";
import React, {useCallback, useEffect, useState} from "react";

const SelectBookingDateCalendar = () => {
    const [firstSelectedDate, setFirstSelectedDate] = useState(null);
    const [lastSelectedDate, setLastSelectedDate] = useState(null);
    const [markedDates, setMarkedDates] = useState({})
    const [initialDate, setInitialDate] = useState({})

    const getCurrentDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    useEffect( () => {
        setInitialDate(getCurrentDate)
    }, [initialDate])

    // Helper test function for setting selectable dates. Can be removed later.
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

        if (!lastSelectedDate && firstSelectedDate && new Date(selectedDate) > new Date(firstSelectedDate)) {
            setLastSelectedDate(selectedDate);
            const newMarkedDates = getDatesRange(firstSelectedDate, selectedDate);
            setMarkedDates(newMarkedDates);
        } else if (lastSelectedDate) {
            setFirstSelectedDate(selectedDate);
            setLastSelectedDate(null);
            setMarkedDates({
                [selectedDate]: { selected: true, color: 'green'},
            });
        } else {
            setFirstSelectedDate(selectedDate);
            setMarkedDates({
                [selectedDate]: { selected: true, color: 'green' },
            });
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
            range[dateString] = { selected: true, color: 'green' };
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return range;
    };

    return(
        <View>
            <Calendar
                style={styles.calendar}
                minDate={getDate(-10)}
                maxDate={getDate(10)}
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