import {ToastAndroid, View} from 'react-native';
import {Calendar} from 'react-native-calendars/src/index';
import {styles} from '../styles/propertyDetailsStyles';
import React, {useCallback, useEffect, useState} from 'react';
import LoadingScreen from '../../loadingscreen/screens/LoadingScreen';
import BookingRepository from '../../../services/availability/bookingRepository';
import ToastMessage from '../../../components/ToastMessage';

const SelectBookingDatesCalendarView = ({
                                            onFirstDateSelected,
                                            onLastDateSelected,
                                            property,
                                        }) => {
    const [unavailableDates, setUnavailableDates] = useState({});
    const [markedDates, setMarkedDates] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchReservationDates = useCallback(async (id, date) => {
        try {
            const repo = new BookingRepository();
            const response = await repo.getBookingsByPropertyIdAndFromDate(id, date);
            return response.flatMap(data => generateDateRange(data.arrivalDate, data.departureDate));
        } catch (error) {
            if (error === 204) {
                return [];
            }
            ToastMessage(error.message, ToastAndroid.LONG);
        }
    }, []);

    const getAvailableDates = useCallback(async () => {
        const availabilities = property.availability;
        return availabilities.flatMap(availability =>
            generateDateRange(
                availability.availableStartDate,
                availability.availableEndDate,
            )
        );
    }, [property]);

    const getUnavailableDates = useCallback(async availableDates => {
        const today = new Date();

        const availableArray = availableDates.map(date => new Date(date).toISOString().split('T')[0])

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

    const onDateClick = useCallback(day => {
        const selectedDate = day.dateString;
        const nonAvailableDates = unavailableDates.reduce((obj, item) => {
            obj[item] = { disabled: true };
            return obj;
        }, {});

        if (nonAvailableDates[selectedDate]) return;

        const updateMarkedDates = (dates) => {
            setMarkedDates({ ...nonAvailableDates, ...dates });
        };

        const handleDateSelection = (range) => {
            const newMarkedDates = { ...nonAvailableDates };
            range.forEach(date => {
                newMarkedDates[date] = { selected: true, color: 'green' };
            });
            updateMarkedDates(newMarkedDates);
        };

        const firstSelectedDate = Object.keys(markedDates).find(date => markedDates[date]?.selected);
        const lastSelectedDate = Object.keys(markedDates).find(date => markedDates[date]?.selected && date !== firstSelectedDate);

        if (firstSelectedDate && !lastSelectedDate) {
            if (new Date(selectedDate) <= new Date(firstSelectedDate) || !isValidRange(firstSelectedDate, selectedDate, nonAvailableDates)) {
                updateMarkedDates({ [selectedDate]: { selected: true, color: 'green' } });
                onFirstDateSelected(selectedDate);
            } else {
                const dateRange = generateDateRange(firstSelectedDate, selectedDate);
                handleDateSelection(dateRange);
                onLastDateSelected(selectedDate);
            }
        } else if (lastSelectedDate) {
            updateMarkedDates({ [selectedDate]: { selected: true, color: 'green' } });
            onFirstDateSelected(selectedDate);
            onLastDateSelected(null);
        } else {
            updateMarkedDates({ [selectedDate]: { selected: true, color: 'green' } });
            onFirstDateSelected(selectedDate);
        }
    }, [markedDates, unavailableDates]);

    const isValidRange = (startDate, endDate, nonAvailableDates) => {
        return !generateDateRange(startDate, endDate).some(date => nonAvailableDates[date]);
    };

    const generateDateRange = (start, end) => {
        const dateArray = [];
        let currentDate = new Date(start);
        const endDate = new Date(end);

        while (currentDate <= endDate) {
            dateArray.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dateArray;
    };


    useEffect(() => {
        async function renderUnavailableDates() {
            const reservationDates = await fetchReservationDates(property.property.id, Date.now());
            const unAvailableDates = await getUnavailableDates(await getAvailableDates());
            return [...reservationDates, ...unAvailableDates];
        }

        renderUnavailableDates().then(dates => {
            let dateMarks = {};
            dates.forEach(date => {
                dateMarks[date] = {disabled: true};
            })
            setMarkedDates(dateMarks);
            setUnavailableDates(dates);
            setLoading(false);
        })

    }, [
        fetchReservationDates,
        property.id,
        getUnavailableDates,
        getAvailableDates,
    ]);

    const getFutureDate = daysInTheFuture => {
        const date = new Date();
        date.setDate(date.getDate() + daysInTheFuture);
        return date;
    };

    if (loading) {
        return <LoadingScreen loadingName={'calendar'}/>;
    } else {
        return (
            <View>
                <Calendar
                    testID={'calendar-list'}
                    style={styles.calendar}
                    minDate={getFutureDate(0).toISOString()}
                    maxDate={getFutureDate(365).toISOString()}
                    markingType={'period'}
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
                                        justifyContent: 'space-between',
                                    },
                                },
                            },
                        },
                    }}
                />
            </View>
        );
    }
};

export default SelectBookingDatesCalendarView;
