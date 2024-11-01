import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import personalDetailsForm from './personalDetailsForm';
import {SafeAreaView} from 'react-native-safe-area-context';

const OnBoarding1 = ({navigation, route}) => {
  const accommodation = route.params.accommodation;
  const parsedAccommodation = route.params.parsedAccommodation;
  const [owner, setOwner] = useState();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const images = route.params.images;
  const [showModal, setShowModal] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const handleBookButton = () => {
    navigation.navigate('simulateStripe', {
      parsedAccommodation: parsedAccommodation,
      calculateCost: calculateCost(),
    });
  };

  const handleWIPButton = () => {
    alert('This feature is a work in progress');
  };

  const handleChangeDates = () => {};

  const calculateCost = () => {
    return (
      parsedAccommodation.Rent * 3 +
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
            <Text style={styles.sectionContent}>05/12/2023 - 08/12/2023</Text>
            <TouchableOpacity onPress={handleWIPButton}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travellers</Text>
            <Text style={styles.sectionContent}>2 adults - 2 kids</Text>
            <TouchableOpacity onPress={handleWIPButton}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.separator} />
          <View style={styles.priceDetails}>
            <Text style={styles.sectionTitle}>Price details</Text>
            <Text style={styles.sectionContent}>
              2 adults - 2 kids | 3 nights
            </Text>

            <Text style={styles.priceBreakdown}>
              €{parsedAccommodation.Rent.toFixed(2)} night x 3 nights - €
              {(parsedAccommodation.Rent * 3).toFixed(2)}
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
});

export default OnBoarding1;
