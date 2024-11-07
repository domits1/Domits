import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Apartment from '../pictures/Onboarding-icons/flat.png';
import House from '../pictures/Onboarding-icons/house.png';
import Villa from '../pictures/Onboarding-icons/mansion.png';
import Boat from '../pictures/Onboarding-icons/house-boat.png';
import Camper from '../pictures/Onboarding-icons/camper-van.png';
import Cottage from '../pictures/Onboarding-icons/cottage.png';

const OnboardingHost = () => {
  const navigation = useNavigation();

  const [accoTypes] = useState([
    'Apartment',
    'House',
    'Villa',
    'Boat',
    'Camper',
    'Cottage',
  ]);

  const accommodationIcons = {
    Apartment: Apartment,
    House: House,
    Villa: Villa,
    Boat: Boat,
    Camper: Camper,
    Cottage: Cottage,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imagesContainer}>
        {accoTypes.map((type, index) => (
          <View style={styles.imageWrapper} key={index}>
            <Image source={accommodationIcons[type]} style={styles.image} />
            <Text style={styles.imageLabel}>{type}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.dashboardButton}
        onPress={() => navigation.navigate('HostDashboard')}>
        <Text style={styles.buttonText}>Go to dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagesContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
  },
  imageWrapper: {
    width: '45%', // Adjust to fit two images per row with spacing
    marginVertical: 10,
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  imageLabel: {
    marginTop: 5,
    fontSize: 16,
    textAlign: 'center',
  },
  dashboardButton: {
    marginTop: 60,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: 177,
    marginLeft: -190,
    opacity: 0.75,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default OnboardingHost;
