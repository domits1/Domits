import React, {useEffect, useState} from 'react';
import {Image, Modal, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import DateFormatterYYYY_MM_DD from '../utils/DateFormatterYYYY_MM_DD';
import BookingProcessCalendarPopup from "./components/BookingProcessCalendarPopup";
import {styles} from "./styles/BookingProcessStyles";

const BookingProcessScreen = ({navigation, route}) => {
  const parsedFirstSelectedDate = route.params.firstSelectedDate;
  const parsedLastSelectedDate = route.params.lastSelectedDate;
  const parsedAccommodation = route.params.parsedAccommodation;
  const [owner, setOwner] = useState();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const images = route.params.images;
  const [showDatePopUp, setShowDatePopUp] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showGuestAmountPopUp, setShowGuestAmountPopUp] = useState(false);
  const [selectedDates, setSelectedDates] = useState({});
  const [selectedRange, setSelectedRange] = useState({});
  const [bookings, setBookings] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);

  const handleDatesSelected = (startDate, endDate) => {
    setSelectedDates({startDate: startDate, endDate: endDate})
  }
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
  const toggleCalendarModal = () => {
    setShowDatePopUp(!showDatePopUp);
  };

  useEffect( () => {
    calculateNights()
  }, [selectedDates])

  useEffect(() => {

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
  }, [parsedAccommodation]);

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
            <TouchableOpacity onPress={toggleCalendarModal}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          {showDatePopUp && (
            <BookingProcessCalendarPopup
              onClose={toggleCalendarModal}
              onConfirm={handleDatesSelected}
              dateRanges={parsedAccommodation.DateRanges}
              bookedDates={bookedDates}
              property={parsedAccommodation}
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

export default BookingProcessScreen;
