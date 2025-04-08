import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import {isSameDay} from 'date-fns';
import {styles} from "../styles/HostCalendarStyles";
import DateFormatterDD_MM_YYYY from "../../../../screens/utils/DateFormatterDD_MM_YYYY";

const CalendarComponent = ({passedProp, isNew, updateDates}) => {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [dates, setDates] = useState([]);
  const [selectedRanges, setSelectedRanges] = useState([]);
  const [originalRanges, setOriginalRanges] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [minimumStay, setMinimumStay] = useState(0);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  useEffect(() => {
    if (passedProp?.DateRanges) {
      setSelectedRanges(passedProp.DateRanges);
      setOriginalRanges(passedProp.DateRanges);
    }
    if (passedProp?.MinimumStay !== undefined) {
      setMinimumStay(passedProp.MinimumStay);
    }
  }, [passedProp]);

  useEffect(() => {
    renderDates();
  }, [month, year, selectedRanges]);

  const renderDates = () => {
    const start = new Date(year, month, 1).getDay();
    const endDate = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const newDates = [];

    for (let i = 1; i <= endDate; i++) {
      const currentDate = new Date(year, month, i);
      const isActiveDay = isSameDay(currentDate, today);
      const isSelected = selectedRanges.some(range =>
        isDateInRange(currentDate, range.startDate, range.endDate),
      );
      const isStartDay = selectedRanges.some(range =>
        isSameDay(currentDate, new Date(range.startDate)),
      );
      const isEndDay = selectedRanges.some(range =>
        isSameDay(currentDate, new Date(range.endDate)),
      );

      newDates.push({
        key: i.toString(),
        date: currentDate,
        isActiveDay,
        isSelected,
        isStartDay,
        isEndDay,
      });
    }

    setDates(newDates);
  };

  const isDateInRange = (date, startDate, endDate) => {
    const selectedDate = new Date(date);
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    return (
      rangeStart &&
      rangeEnd &&
      selectedDate >= rangeStart &&
      selectedDate <= rangeEnd
    );
  };

  const handleDateClick = clickedDate => {
    if (clickedDate >= new Date()) {
      setDateRange(prevDateRange => {
        if (!prevDateRange.startDate) {
          return {startDate: clickedDate, endDate: null};
        }

        if (prevDateRange.startDate && !prevDateRange.endDate) {
          const newDateRange = {
            startDate: Math.min(prevDateRange.startDate, clickedDate),
            endDate: Math.max(prevDateRange.startDate, clickedDate),
          };

          const daysSelected =
            (newDateRange.endDate - newDateRange.startDate) /
              (1000 * 60 * 60 * 24) +
            1;

          if (daysSelected < minimumStay) {
            Alert.alert(
              'Invalid Range',
              `The selected range is too short. Minimum stay is ${minimumStay} days.`,
            );
            return {startDate: null, endDate: null};
          }

          setSelectedRanges([...selectedRanges, newDateRange]);
          updateDates([...selectedRanges, newDateRange]);
          return {startDate: null, endDate: null};
        }

        return {startDate: null, endDate: null};
      });
    }
  };

  const navigateDates = direction => {
    setMonth(prevMonth => {
      if (direction === 'prev') {
        return prevMonth === 0 ? 11 : prevMonth - 1;
      }
      if (direction === 'next') {
        return prevMonth === 11 ? 0 : prevMonth + 1;
      }
      return prevMonth;
    });

    setYear(prevYear => {
      if (direction === 'prev' && month === 0) {
        return prevYear - 1;
      }
      if (direction === 'next' && month === 11) {
        return prevYear + 1;
      }
      return prevYear;
    });
  };

  const asyncSaveDates = async () => {
    const body = {
      DateRanges: selectedRanges,
      ID: passedProp.ID,
    };
    console.log(body);
    try {
      const response = await fetch(
        'https://m2e7jwiohg.execute-api.eu-north-1.amazonaws.com/default/UpdateAccommodation',
        {
          method: 'PUT',
          body: JSON.stringify(body),
          headers: {'Content-Type': 'application/json'},
        },
      );
      if (!response.ok) {
        Alert.alert('Error', 'Something went wrong. Please try again later.');
        throw new Error('Failed to fetch');
      }
      Alert.alert('Success', 'Update successful!');
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const CustomButton = ({title, onPress, style}) => {
    return (
      <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
        <Text style={styles.buttonText}>{title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.calendarComponentHeader}>
        <Text style={styles.monthYear}>{`${months[month]} ${year}`}</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDates('prev')}>
            <Text style={styles.navButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateDates('next')}>
            <Text style={styles.navButtonText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.datesContainer}>
        {dates.map(item => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.date,
              item.isActiveDay && styles.activeDay,
              item.isSelected && styles.selectedDay,
              item.isStartDay && styles.startDay,
              item.isEndDay && styles.endDay,
            ]}
            onPress={() => handleDateClick(item.date)}>
            <Text style={{color: 'black'}}>{item.date.getDate()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View>
        {selectedRanges.map((range, index) => (
          <View key={index} style={styles.range}>
            <Text style={{color: 'black'}}>
              {`${DateFormatterDD_MM_YYYY(
                range.startDate,
              )} - ${DateFormatterDD_MM_YYYY(range.endDate)}`}
            </Text>
            <CustomButton
              title="Remove"
              style={styles.RemoveButton}
              onPress={() =>
                setSelectedRanges(prevRanges =>
                  prevRanges.filter((_, i) => i !== index),
                )
              }
            />
          </View>
        ))}
      </View>
      {!isNew && (
        <View style={styles.actions}>
          <CustomButton
            title="Undo"
            onPress={() => setSelectedRanges(originalRanges)}
            style={styles.UndoButton}
          />
          <CustomButton
            title="Save"
            onPress={asyncSaveDates}
            style={styles.SaveButton}
          />
        </View>
      )}
    </View>
  );
};

export default CalendarComponent;
