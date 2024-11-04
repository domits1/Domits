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

  const CalendarModal = ({onClose, onConfirm, maxDate, dateRanges}) => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    const onDayPress = day => {
      if (!selectedRange.startDate) {
        setSelectedRange({startDate: day.dateString});
      } else if (!selectedRange.endDate) {
        setSelectedRange({...selectedRange, endDate: day.dateString});
      } else {
        setSelectedRange({startDate: day.dateString});
      }
    };

    const getDatesInRange = (start, end) => {
      const dates = {};
      let currentDate = new Date(start);
      const endDate = new Date(end);

      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        dates[dateString] = {
          color: '#4CAF50',
          textColor: 'white',
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
    };

    const markedDates = {
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
        calculateNights();
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
              minDate={today} // Set minDate to today
              maxDate={maxDate}
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

  const GuestAmountModal = ({onClose, maxGuests}) => {
    const totalGuests = adults + kids + pets;

    const incrementGuests = type => {
      if (totalGuests < maxGuests) {
        if (type === 'adults') {
          setAdults(adults + 1);
        }
        if (type === 'kids') {
          setKids(kids + 1);
        }
        if (type === 'pets') {
          setPets(pets + 1);
        }
      }
    };

    const decrementGuests = type => {
      if (type === 'adults' && adults > 1) {
        setAdults(adults - 1);
      }
      if (type === 'kids' && kids > 0) {
        setKids(kids - 1);
      }
      if (type === 'pets' && pets > 0) {
        setPets(pets - 1);
      }
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
                <Text style={styles.counterText}>{adults}</Text>
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
                <Text style={styles.counterText}>{kids}</Text>
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
                <Text style={styles.counterText}>{pets}</Text>
                <TouchableOpacity onPress={() => incrementGuests('pets')}>
                  <Text style={styles.counterButton}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Close Button */}
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
              minDate={parsedAccommodation.DateRanges[0].startDate}
              maxDate={parsedAccommodation.DateRanges[2].endDate}
              dateRanges={parsedAccommodation.DateRanges}
            />
          )}
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travellers</Text>
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
