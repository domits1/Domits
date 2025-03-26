import React, {useEffect, useState} from 'react';
import {Image, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import BookingEngineCalendarPopup from "../components/BookingEngineCalendarPopup";
import {styles} from "../styles/BookingEngineStyles";
import BookingEngineGuestsPopup from "../components/BookingEngineGuestsPopup";
import FetchBookingsByProperty from "../hooks/FetchBookingsByProperty";
import CalculateNumberOfNights from "../utils/CalculateNumberOfNights";

const BookingEngineScreen = ({navigation, route}) => {
  const parsedFirstSelectedDate = route.params.firstSelectedDate;
  const parsedLastSelectedDate = route.params.lastSelectedDate;
  const parsedAccommodation = route.params.parsedAccommodation;
  const images = route.params.images;
  const [showDatePopUp, setShowDatePopUp] = useState(false);
  const [showGuestAmountPopUp, setShowGuestAmountPopUp] = useState(false);
  const [selectedDates, setSelectedDates] = useState({});
  const [bookings, setBookings] = useState([]);
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [pets, setPets] = useState(0);
  const [bookedDates, setBookedDates] = useState([]);
  const [nights, setNights] = useState(0);

    useEffect(() => {
        handleDatesSelected(parsedFirstSelectedDate, parsedLastSelectedDate)
    }, [parsedFirstSelectedDate, parsedLastSelectedDate])

    useEffect(() => {
      CalculateNumberOfNights(selectedDates.startDate, selectedDates.endDate, setNights)
    }, [selectedDates])

    useEffect(() => {
        FetchBookingsByProperty(parsedAccommodation, setBookings, setBookedDates);
    }, [parsedAccommodation]);

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

  const handleGuestAmountPopUp = () => {
    setShowGuestAmountPopUp(!showGuestAmountPopUp);
  };

  /**
   * Calculate the total cost of a booking.
   * @returns {string} - Summed up costs of a booking.
   */
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
            <BookingEngineCalendarPopup
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
              <BookingEngineGuestsPopup
                  onClose={handleGuestAmountPopUp}
                  maxGuests={parsedAccommodation.GuestAmount}
                  currentAdults={adults}
                  currentKids={kids}
                  currentPets={pets}
                  setAdults={setAdults}
                  setKids={setKids}
                  setPets={setPets}
              />
          )}
          <View style={styles.separator} />
          <View style={styles.priceDetails}>
            <Text style={styles.sectionTitle}>Price details</Text>
            <Text style={styles.sectionContent}>
              {adults} adults - {kids} kids - {pets} pets | {nights} nights
            </Text>

            <Text style={styles.priceDetailText}>
              €{Number(parsedAccommodation.Rent).toFixed(2)} night x {nights} nights - €
              {(parsedAccommodation.Rent * nights).toFixed(2)}
            </Text>

            <Text style={styles.priceDetailText}>
              Cleaning fee - €{parsedAccommodation.CleaningFee.toFixed(2)}
            </Text>

            <Text style={styles.priceDetailText}>Cat tax - €0.00</Text>

            <Text style={styles.priceDetailText}>
              Domits service fee - €{parsedAccommodation.ServiceFee.toFixed(2)}
            </Text>

            <Text style={styles.total}>Total - €{calculateCost()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleBookButton} style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Confirm & Pay</Text>
        </TouchableOpacity>
        <Text style={styles.stripeText}>
          Secure payment gateway powered by Stripe.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BookingEngineScreen;
