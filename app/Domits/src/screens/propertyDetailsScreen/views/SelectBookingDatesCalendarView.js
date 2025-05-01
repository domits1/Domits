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
  const [firstSelectedDate, setFirstSelectedDate] = useState(null);
  const [lastSelectedDate, setLastSelectedDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchReservationDates = useCallback(async ({id, date}) => {
    try {
      return await new BookingRepository()
        .getBookingsByPropertyIdAndFromDate(id, date)
        .map(data => generateDateRange(data.arrivalDate, data.departureDate));
    } catch (error) {
      console.error(error);
      if (error === 204) {
        return [];
      }
      ToastMessage(error.message, ToastAndroid.LONG);
    }
  }, []);

  const getAvailableDates = useCallback(async () => {
    const availabilities = property.availability;
    const availableDates = [];

    availabilities.forEach(availability => {
      availableDates.push(
        generateDateRange(
          availability.availableStartDate,
          availability.availableEndDate,
        ),
      );
    });
    return availableDates;
  }, [property]);

  const getUnavailableDates = useCallback(async ({availableDates}) => {
    const today = new Date();

    const nonAvailableDates = [];
    for (let i = 0; i < 365; i++) {
      const date = new Date();
      date.setDate(today.getDate() + i);
      if (!availableDates.includes(date)) {
        nonAvailableDates.push(date.getTime());
      }
    }
    return nonAvailableDates;
  }, []);

  const onDateClick = useCallback(
    day => {
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

      if (
        !lastSelectedDate &&
        firstSelectedDate &&
        new Date(selectedDate) > new Date(firstSelectedDate)
      ) {
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
        onFirstDateSelected(selectedDate);

        newMarkedDates[selectedDate] = {selected: true, color: 'green'};
        setMarkedDates(newMarkedDates);
      }
    },
    [
      firstSelectedDate,
      getUnavailableDates,
      lastSelectedDate,
      markedDates,
      onFirstDateSelected,
      onLastDateSelected,
    ],
  );

  const generateDateRange = (start, end) => {
    const dateArray = [];
    let currentDate = new Date(start);

    while (currentDate <= new Date(end)) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
  };

  useEffect(() => {
    async function renderUnavailableDates() {
      const reservationDates = await fetchReservationDates(property.property.id, Date.now());
      const unAvailableDates = await getUnavailableDates(await getAvailableDates());
      let dateMarks = {};
      reservationDates.forEach(
          date => (dateMarks[date.toISOString().split('T')[0]] = {disabled: true}),
      );
      unAvailableDates.forEach(
          date => (dateMarks[date.toISOString().split('T')[0]] = {disabled: true}),
      );
      return dateMarks;
    }

    renderUnavailableDates().then(dates => {
      setMarkedDates(dates);
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
    return <LoadingScreen loadingName={'calendar'} />;
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
