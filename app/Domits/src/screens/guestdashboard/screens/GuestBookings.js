import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ToastAndroid,
  Text,
} from 'react-native';
import TabHeader from '../../accounthome/components/TabHeader';
import TestPropertyRepository from '../../../services/property/test/testPropertyRepository';
import PropertyRepository from '../../../services/property/propertyRepository';
import TestBookingRepository from '../../../services/availability/test/testBookingRepository';
import BookingRepository from '../../../services/availability/bookingRepository';
import {useAuth} from '../../../context/AuthContext';
import ToastMessage from '../../../components/ToastMessage';
import LoadingScreen from '../../loadingscreen/screens/LoadingScreen';
import BookingView from '../views/BookingView';

const GuestBookings = ({navigation}) => {
  const {user} = useAuth();

  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const propertyRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestPropertyRepository()
      : new PropertyRepository();

  const bookingRepository =
    process.env.REACT_APP_TESTING === 'true'
      ? new TestBookingRepository()
      : new BookingRepository();

  const getBookingsByGuestId = async () => {
    const bookingsResponse = await bookingRepository.getBookingsByGuestId(
      user.username,
    );
    const upcomingBookings = bookingsResponse.Items.filter(
      booking => parseFloat(booking.departureDate.N) > Date.now(),
    );
    const sortedBookings = upcomingBookings
      .sort(
        (a, b) => parseFloat(a.departureDate.N) - parseFloat(b.departureDate.N),
      )
      .slice(0, 11);
    setBookings(sortedBookings);
    return sortedBookings.map(booking => booking.property_id.S);
  };

  const getProperties = async bookings => {
    setProperties(await propertyRepository.getPropertiesList(bookings));
  };

  useEffect(() => {
    async function executeAsyncFunction() {
      try {
        const bookings = await getBookingsByGuestId();
        await getProperties(bookings);
      } catch (error) {
        ToastMessage(error.message, ToastAndroid.SHORT);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    executeAsyncFunction();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!properties || properties.length === 0) {
    return <Text>No bookings found or something went wrong.</Text>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView>
        <TabHeader tabTitle={'Upcoming Bookings'} />
        <View style={styles.bodyContainer}>
          {bookings.map((booking, index) => (
            <BookingView
              key={booking.id.S || index}
              property={properties[index]}
              booking={booking}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  bodyContainer: {
    marginTop: '15%',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});

export default GuestBookings;
