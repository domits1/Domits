import React, {useEffect, useState, memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import personalDetailsForm from './personalDetailsForm';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Calendar} from 'react-native-calendars';
import DateFormatterYYYY_MM_DD from '../utils/DateFormatterYYYY_MM_DD';

const OnBoarding1 = ({navigation, route}) => {
  const accommodation = route.params.accommodation;
  const parsedAccommodation = route.params.parsedAccommodation;
  const [owner, setOwner] = useState();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const images = route.params.images;
  const [showDatePopUp, setShowDatePopUp] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showGuestAmountPopUp, setShowGuestAmountPopUp] = useState(false);

  const handleBookButton = () => {
    navigation.navigate('simulateStripe', {
      parsedAccommodation: parsedAccommodation,
      calculateCost: calculateCost(),
      adults: adults,
      kids: kids,
      pets: pets,
      nights: nights,
    });
  };

  const handleChangeDatesPopUp = () => {
    setShowDatePopUp(!showDatePopUp);
  };

  const [selectedDates, setSelectedDates] = useState({});
  const [selectedRange, setSelectedRange] = useState({});

  useEffect(() => {
    calculateNights();
  }, [selectedDates]);

  const [bookings, setBookings] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    if (!accommodation) {
      return;
    }

    const fetchBookings = async () => {
      try {
        const response = await fetch(
          'https://ct7hrhtgac.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingByAccommodationAndStatus',
          {
            method: 'POST',
            body: JSON.stringify({
              AccoID: parsedAccommodation.ID,
              Status: 'Accepted',
            }),
            headers: {
              'Content-type': 'application/json; charset=UTF-8',
            },
          },
        );
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await response.json();

        if (data.body && typeof data.body === 'string') {
          const retrievedBookingDataArray = JSON.parse(data.body);

          if (Array.isArray(retrievedBookingDataArray)) {
            const validBookings = retrievedBookingDataArray
              .filter(booking => {
                const startDate = booking.StartDate?.S;
                const endDate = booking.EndDate?.S;

                const startDateValid =
                  startDate && !isNaN(Date.parse(startDate));
                const endDateValid = endDate && !isNaN(Date.parse(endDate));

                return startDateValid && endDateValid;
              })
              .map(booking => {
                const startDateObj = new Date(booking.StartDate.S);
                startDateObj.setDate(startDateObj.getDate() + 1);
                const startDateFormatted =
                  DateFormatterYYYY_MM_DD(startDateObj);
                const endDateObj = new Date(booking.EndDate.S);
                endDateObj.setDate(endDateObj.getDate() + 1);
                const endDateFormatted = DateFormatterYYYY_MM_DD(endDateObj);

                return [startDateFormatted, endDateFormatted];
              });

            setBookings(retrievedBookingDataArray);
            setBookedDates(validBookings);
          } else {
            console.error(
              'Retrieved data is not an array:',
              retrievedBookingDataArray,
            );
          }
        }
      } catch (error) {
        console.error('Failed to fetch booking data:', error);
      }
    };

    fetchBookings();
  }, [accommodation, parsedAccommodation]);

  const CalendarModal = ({onClose, onConfirm, dateRanges}) => {
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

    const onDayPress = day => {
      const selectedDate = day.dateString;
      if (!combinedDateFilter(selectedDate)) {
        alert('This date is unavailable.');
        return;
      }

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

    const markedDates = {
      ...unavailableDates,
      ...(selectedRange.startDate && selectedRange.endDate
        ? getDatesInRange(selectedRange.startDate, selectedRange.endDate)
        : {}),
      [selectedRange.startDate]: {
        startingDay: true,
        color: '#4CAF50',
        textColor: 'white',
      },
      [selectedRange.endDate]: {
        endingDay: true,
        color: '#4CAF50',
        textColor: 'white',
      },
    };

    const confirmSelection = () => {
      if (selectedRange.startDate && selectedRange.endDate) {
        onConfirm(selectedRange);
        onClose();
      } else {
        alert('Please select both start and end dates.');
      }
    };

    return (
      <Modal transparent={true} visible={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.modalTitle}>Select Dates</Text>
            <Calendar
              markingType="period"
              minDate={minDate}
              maxDate={maxDateStr}
              onDayPress={onDayPress}
              markedDates={markedDates}
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
  };

  const handleGuestAmountPopUp = () => {
    setShowGuestAmountPopUp(!showGuestAmountPopUp);
  };

  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [pets, setPets] = useState(0);

  const GuestAmountModal = ({
    onClose,
    maxGuests,
    currentAdults,
    currentKids,
    currentPets,
  }) => {
    const [tempAdults, setTempAdults] = useState(currentAdults || 1);
    const [tempKids, setTempKids] = useState(currentKids || 0);
    const [tempPets, setTempPets] = useState(currentPets || 0);

    const totalGuests = tempAdults + tempKids + tempPets;

    const incrementGuests = type => {
      if (totalGuests < maxGuests) {
        if (type === 'adults') {
          setTempAdults(tempAdults + 1);
        }
        if (type === 'kids') {
          setTempKids(tempKids + 1);
        }
        if (type === 'pets') {
          setTempPets(tempPets + 1);
        }
      }
    };

    const decrementGuests = type => {
      if (type === 'adults' && tempAdults > 0) {
        setTempAdults(tempAdults - 1);
      }
      if (type === 'kids' && tempKids > 0) {
        setTempKids(tempKids - 1);
      }
      if (type === 'pets' && tempPets > 0) {
        setTempPets(tempPets - 1);
      }
    };

    const confirmGuestSelection = () => {
      setAdults(tempAdults);
      setKids(tempKids);
      setPets(tempPets);
      onClose();
    };

    return (
      <Modal transparent={true} visible={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.guestAmountModalContent}>
            <Text style={styles.modalTitle}>Select Guests</Text>

            {/* Adults */}
            <View style={styles.guestRow}>
              <Text style={styles.guestType}>Adults</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity onPress={() => decrementGuests('adults')}>
                  <Text style={styles.counterButton}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterText}>{tempAdults}</Text>
                <TouchableOpacity onPress={() => incrementGuests('adults')}>
                  <Text style={styles.counterButton}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Kids */}
            <View style={styles.guestRow}>
              <Text style={styles.guestType}>Kids</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity onPress={() => decrementGuests('kids')}>
                  <Text style={styles.counterButton}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterText}>{tempKids}</Text>
                <TouchableOpacity onPress={() => incrementGuests('kids')}>
                  <Text style={styles.counterButton}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pets */}
            <View style={styles.guestRow}>
              <Text style={styles.guestType}>Pets</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity onPress={() => decrementGuests('pets')}>
                  <Text style={styles.counterButton}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterText}>{tempPets}</Text>
                <TouchableOpacity onPress={() => incrementGuests('pets')}>
                  <Text style={styles.counterButton}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm and Close Buttons */}
            <TouchableOpacity
              onPress={confirmGuestSelection}
              style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const [nights, setNights] = useState(0);

  const calculateNights = () => {
    const start = new Date(selectedDates.startDate);
    const end = new Date(selectedDates.endDate);
    const timeDifference = end.getTime() - start.getTime();
    const days = timeDifference / (1000 * 3600 * 24);
    setNights(days);
    return days;
  };

  const calculateCost = () => {
    return (
      parsedAccommodation.Rent * nights +
      parsedAccommodation.CleaningFee +
      parsedAccommodation.ServiceFee
    ).toFixed(2);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView>
        <View style={styles.header}>
          <Icon
            name="chevron-back-outline"
            size={30}
            color="black"
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.headerText}>Detail</Text>
        </View>
        <Image source={{uri: images[0].uri}} style={styles.image} />
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{parsedAccommodation.Title}</Text>
          <Text style={styles.description}>
            {parsedAccommodation.Description}
          </Text>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            <Text style={styles.sectionContent}>
              {selectedDates && selectedDates.startDate && selectedDates.endDate
                ? `${selectedDates.startDate} - ${selectedDates.endDate}`
                : 'Choose dates'}
            </Text>
            <TouchableOpacity onPress={handleChangeDatesPopUp}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          {showDatePopUp && (
            <CalendarModal
              onClose={handleChangeDatesPopUp}
              onConfirm={setSelectedDates}
              dateRanges={parsedAccommodation.DateRanges}
            />
          )}
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guests</Text>
            <Text style={styles.sectionContent}>
              {adults} adults - {kids} kids - {pets} pets
            </Text>
            <TouchableOpacity onPress={handleGuestAmountPopUp}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          {showGuestAmountPopUp && (
            <GuestAmountModal
              onClose={handleGuestAmountPopUp}
              maxGuests={parsedAccommodation.GuestAmount}
              currentAdults={adults}
              currentKids={kids}
              currentPets={pets}
            />
          )}
          <View style={styles.separator} />
          <View style={styles.priceDetails}>
            <Text style={styles.sectionTitle}>Price details</Text>
            <Text style={styles.sectionContent}>
              {adults} adults - {kids} kids - {pets} pets | {nights} nights
            </Text>

            <Text style={styles.priceBreakdown}>
              €{parsedAccommodation.Rent.toFixed(2)} night x {nights} nights - €
              {(parsedAccommodation.Rent * nights).toFixed(2)}
            </Text>

            <Text style={styles.fee}>
              Cleaning fee - €{parsedAccommodation.CleaningFee.toFixed(2)}
            </Text>

            <Text style={styles.tax}>Cat tax - €0.00</Text>

            <Text style={styles.serviceFee}>
              Domits service fee - €{parsedAccommodation.ServiceFee.toFixed(2)}
            </Text>

            <Text style={styles.total}>Total - €{calculateCost()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleBookButton} style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Confirm & Pay</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  separator: {
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionContent: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  linkText: {
    fontSize: 16,
    color: '#0056b3',
  },
  priceDetails: {
    marginBottom: 20,
  },
  priceBreakdown: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  fee: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  tax: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  serviceFee: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAmountModalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  guestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  guestType: {
    fontSize: 16,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    fontSize: 20,
    paddingHorizontal: 10,
    color: '#4CAF50',
  },
  counterText: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  closeButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  calendarModalContent: {
    width: '90%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnBoarding1;
