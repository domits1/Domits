import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import Apartment from '../pictures/Onboarding-icons/flat.png';
import House from '../pictures/Onboarding-icons/house.png';
import Villa from '../pictures/Onboarding-icons/mansion.png';
import Boat from '../pictures/Onboarding-icons/house-boat.png';
import Camper from '../pictures/Onboarding-icons/camper-van.png';
import Cottage from '../pictures/Onboarding-icons/cottage.png';

import CamperVan from '../pictures/Onboarding-icons/camper-van.png';
import Motorboat from '../pictures/BoatTypes/motorboat.png';
import Sailboat from '../pictures/BoatTypes/sailboat.png';
import Rib from '../pictures/BoatTypes/rib.png';
import Catamaran from '../pictures/BoatTypes/catamaran.png';
import Yacht from '../pictures/BoatTypes/yacht.png';
import Barge from '../pictures/BoatTypes/barge.png';
import Houseboat from '../pictures/BoatTypes/house_boat.png';
import Jetski from '../pictures/BoatTypes/jetski.png';
import Electric_Boat from '../pictures/BoatTypes/electric-boat.png';
import Boat_Without_License from '../pictures/BoatTypes/boat-without-license.png';

import {Picker} from '@react-native-picker/picker';

const OnboardingHost = () => {
  const navigation = useNavigation();
  const [page, setPage] = useState(0);
  const [selectedAccoType, setSelectedAccoType] = useState(null);
  const [formData, setFormData] = useState({
    GuestAccess: '',
    BoatType: '',
    CamperType: '',
    GuestAmount: 0,
    Cabins: 0,
    Bedrooms: 0,
    Bathrooms: 0,
    Beds: 0,
  });
  const [errors, setErrors] = useState({});
  const [selectedCountry, setSelectedCountry] = useState('');
  const countries = [
    'Netherlands',
    'United States',
    'Canada',
    'United Kingdom',
    'Germany',
    'France',
    'Italy',
    'Spain',
    'Portugal',
    'Greece',
    'Croatia',
    'Belgium',
    'Australia',
  ];
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const accoTypes = [
    'Apartment',
    'House',
    'Villa',
    'Boat',
    'Camper',
    'Cottage',
  ];
  const boatTypes = [
    'Motorboat',
    'Sailboat',
    'Rib',
    'Catamaran',
    'Yacht',
    'Barge',
    'Houseboat',
    'Jetski',
    'Electric boat',
    'Boat without license',
  ];

  const camperTypes = [
    'Campervan',
    'Sprinter-Type',
    'Cabover Motorhome',
    'Semi-integrated Motorhome',
    'Integrated Motorhome',
    'Roof Tent',
    'Other',
  ];

  const accommodationIcons = {
    Apartment,
    House,
    Villa,
    Boat,
    Camper,
    Cottage,
  };

  const boatIcons = {
    Motorboat,
    Sailboat,
    Rib,
    Catamaran,
    Yacht,
    Barge,
    Houseboat,
    Jetski,
    'Electric boat': Electric_Boat,
    'Boat without license': Boat_Without_License,
  };

  const handleSelectType = type => {
    setSelectedAccoType(type);
    setFormData({
      ...formData,
      BoatType: '', // Reset BoatType if a new type is selected
      CamperType: '', // Reset CamperType if a new type is selected
      GuestAccess: '', // Reset GuestAccess for other selections
    });
  };

  const handleSelectBoatType = boatType => {
    setFormData({
      ...formData,
      BoatType: boatType,
    });
  };

  const handleSelectCamperType = camperType => {
    setFormData({
      ...formData,
      CamperType: camperType,
    });
  };

  const handleSelectGuestAccess = guestAccess => {
    setFormData({
      ...formData,
      GuestAccess: guestAccess,
    });
  };

  const pageUpdater = pageNumber => {
    setPage(pageNumber);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const selectCountry = country => {
    setSelectedCountry(country);
    setDropdownOpen(false);
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const incrementAmount = (field) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: prevData[field] + 1,
    }));
  };

  const decrementAmount = (field) => {
    if (formData[field] > 0) {
      setFormData((prevData) => ({
        ...prevData,
        [field]: prevData[field] - 1,
      }));
    }
  };
  const renderPageContent = page => {
    switch (page) {
      case 0:
        return (
          <SafeAreaView style={styles.container}>
            <View style={styles.imagesContainer}>
              <Text style={styles.title}>
                What best describes your accommodation?
              </Text>
              {accoTypes.map((type, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.imageWrapper,
                    selectedAccoType === type && styles.selected,
                  ]}
                  onPress={() => handleSelectType(type)}>
                  <Image
                    source={accommodationIcons[type]}
                    style={styles.image}
                  />
                  <Text style={styles.imageLabel}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.dashboardButton}
                onPress={() => navigation.navigate('HostDashboard')}>
                <Text style={styles.buttonText}>Go to dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !selectedAccoType && styles.disabledButton,
                ]}
                onPress={() => pageUpdater(1)}
                disabled={!selectedAccoType}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        );
      case 1:
        return (
          <ScrollView>
            <SafeAreaView style={styles.container}>
              {selectedAccoType === 'Boat' ? (
                <View style={styles.boatContainer}>
                  <Text style={styles.title}>
                    What type of boat do you own?
                  </Text>
                  <View style={styles.imagesContainer}>
                    {boatTypes.map((type, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.imageWrapper,
                          formData.BoatType === type && styles.selected,
                        ]}
                        onPress={() => handleSelectBoatType(type)}>
                        <Image source={boatIcons[type]} style={styles.image} />
                        <Text style={styles.imageLabel}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : selectedAccoType === 'Camper' ? (
                <View style={styles.boatContainer}>
                  <Text style={styles.title}>
                    What type of camper do you own?
                  </Text>
                  <View style={styles.imagesContainer}>
                    {camperTypes.map((type, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.imageWrapper,
                          formData.CamperType === type && styles.selected,
                        ]}
                        onPress={() => handleSelectCamperType(type)}>
                        <Image source={CamperVan} style={styles.image} />
                        <Text style={styles.imageLabel}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.guestAccessContainer}>
                  <Text style={styles.title}>
                    What kind of space do your guests have access to?
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.guestAccessItem,
                      formData.GuestAccess === 'Entire house' &&
                        styles.selectedGuestAccessItem,
                    ]}
                    onPress={() => handleSelectGuestAccess('Entire house')}>
                    <Text
                      style={[
                        styles.guestAccessTitle,
                        formData.GuestAccess === 'Entire house' &&
                          styles.selectedGuestAccessText,
                      ]}>
                      Entire house
                    </Text>
                    <Text
                      style={[
                        styles.guestAccessDescription,
                        formData.GuestAccess === 'Entire house' &&
                          styles.selectedGuestAccessText,
                      ]}>
                      Guests have the entire space to themselves
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.guestAccessItem,
                      formData.GuestAccess === 'Room' &&
                        styles.selectedGuestAccessItem,
                    ]}
                    onPress={() => handleSelectGuestAccess('Room')}>
                    <Text
                      style={[
                        styles.guestAccessTitle,
                        formData.GuestAccess === 'Room' &&
                          styles.selectedGuestAccessText,
                      ]}>
                      Room
                    </Text>
                    <Text
                      style={[
                        styles.guestAccessDescription,
                        formData.GuestAccess === 'Room' &&
                          styles.selectedGuestAccessText,
                      ]}>
                      Guests have their own room in a house and share other
                      spaces
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.guestAccessItem,
                      formData.GuestAccess === 'Shared room' &&
                        styles.selectedGuestAccessItem,
                    ]}
                    onPress={() => handleSelectGuestAccess('Shared room')}>
                    <Text
                      style={[
                        styles.guestAccessTitle,
                        formData.GuestAccess === 'Shared room' &&
                          styles.selectedGuestAccessText,
                      ]}>
                      A shared room
                    </Text>
                    <Text
                      style={[
                        styles.guestAccessDescription,
                        formData.GuestAccess === 'Shared room' &&
                          styles.selectedGuestAccessText,
                      ]}>
                      Guests sleep in a room or common area that they may share
                      with you or others
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => pageUpdater(0)}>
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.nextButton,
                    ((selectedAccoType === 'Boat' && !formData.BoatType) ||
                      (selectedAccoType === 'Camper' && !formData.CamperType) ||
                      (!formData.GuestAccess &&
                        selectedAccoType !== 'Boat' &&
                        selectedAccoType !== 'Camper')) &&
                      styles.disabledButton,
                  ]}
                  onPress={() => pageUpdater(2)}
                  disabled={
                    (selectedAccoType === 'Boat' && !formData.BoatType) ||
                    (selectedAccoType === 'Camper' && !formData.CamperType) ||
                    (!formData.GuestAccess &&
                      selectedAccoType !== 'Boat' &&
                      selectedAccoType !== 'Camper')
                  }>
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </ScrollView>
        );
      case 2:
        return (
          <SafeAreaView style={styles.container}>
            <Text style={styles.title}>
              Where can we find your accommodation?
            </Text>
            <Text style={styles.subtitle}>Select your country</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Country*</Text>
              <TouchableOpacity
                onPress={toggleDropdown}
                style={styles.dropdown}>
                <Text style={styles.dropdownText}>
                  {selectedCountry || 'Select your country'}
                </Text>
              </TouchableOpacity>
              {dropdownOpen && (
                <FlatList
                  data={countries}
                  keyExtractor={item => item}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => selectCountry(item)}>
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.dropdownList}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>City*</Text>
              <TextInput
                placeholder="Select your city"
                value={formData.City}
                onChangeText={value => handleInputChange('City', value)}
                style={[styles.input, errors.City && styles.errorInput]}
              />
              {errors.City && (
                <Text style={styles.errorText}>{errors.City}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Street + house nr.*</Text>
              <TextInput
                placeholder="Enter your address"
                value={formData.Address}
                onChangeText={value => handleInputChange('Address', value)}
                style={[styles.input, errors.Address && styles.errorInput]}
              />
              {errors.Address && (
                <Text style={styles.errorText}>{errors.Address}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Postal Code*</Text>
              <TextInput
                placeholder="Enter your postal code"
                value={formData.PostalCode}
                onChangeText={value => handleInputChange('PostalCode', value)}
                style={[styles.input, errors.PostalCode && styles.errorInput]}
              />
              {errors.PostalCode && (
                <Text style={styles.errorText}>{errors.PostalCode}</Text>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => pageUpdater(1)}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (!selectedCountry ||
                    !formData.City ||
                    !formData.Address ||
                    !formData.PostalCode) &&
                    styles.disabledButton,
                ]}
                onPress={() => pageUpdater(3)}
                disabled={
                  !selectedCountry ||
                  !formData.City ||
                  !formData.Address ||
                  !formData.PostalCode
                }>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        );
      case 3:
        return (
          <SafeAreaView style={styles.container}>
            <Text style={styles.title}>How many people can stay here?</Text>
            <ScrollView>
              <View style={styles.guestAmountItem}>
                <Text style={styles.label}>Guests</Text>
                <View style={styles.amountBtnBox}>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => decrementAmount('GuestAmount')}>
                    <Text style={styles.buttonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.amountText}>{formData.GuestAmount}</Text>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => incrementAmount('GuestAmount')}
                    disabled={formData.GuestAmount >= 10}>
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {selectedAccoType === 'Boat' && (
                <View style={styles.guestAmountItem}>
                  <Text style={styles.label}>Cabins</Text>
                  <View style={styles.amountBtnBox}>
                    <TouchableOpacity
                      style={styles.roundButton}
                      onPress={() => decrementAmount('Cabins')}>
                      <Text style={styles.buttonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.amountText}>{formData.Cabins}</Text>
                    <TouchableOpacity
                      style={styles.roundButton}
                      onPress={() => incrementAmount('Cabins')}
                      disabled={formData.Cabins >= 10}>
                      <Text style={styles.buttonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.guestAmountItem}>
                <Text style={styles.label}>Bedrooms</Text>
                <View style={styles.amountBtnBox}>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => decrementAmount('Bedrooms')}>
                    <Text style={styles.buttonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.amountText}>{formData.Bedrooms}</Text>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => incrementAmount('Bedrooms')}
                    disabled={
                      formData.Bedrooms >=
                      (selectedAccoType === 'Boat' ? 10 : 20)
                    }>
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.guestAmountItem}>
                <Text style={styles.label}>Bathrooms</Text>
                <View style={styles.amountBtnBox}>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => decrementAmount('Bathrooms')}>
                    <Text style={styles.buttonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.amountText}>{formData.Bathrooms}</Text>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => incrementAmount('Bathrooms')}
                    disabled={formData.Bathrooms >= 10}>
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.guestAmountItem}>
                <Text style={styles.label}>Beds</Text>
                <View style={styles.amountBtnBox}>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => decrementAmount('Beds')}>
                    <Text style={styles.buttonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.amountText}>{formData.Beds}</Text>
                  <TouchableOpacity
                    style={styles.roundButton}
                    onPress={() => incrementAmount('Beds')}
                    disabled={formData.Beds >= 10}>
                    <Text style={styles.buttonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setPage(2)}>
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => setPage(3)}>
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        );
      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderPageContent(page)}</View>;
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
    width: '45%',
    marginVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    padding: 10,
  },
  selected: {
    borderColor: '#003366',
    backgroundColor: '#ffffff',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginLeft: '10%',
    width: '80%',
  },
  dashboardButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: '55%',
    alignItems: 'center',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: '35%',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: '35%',
    alignItems: 'center',
  },
  guestAccessItem: {
    marginVertical: 10,
    padding: 10,
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    borderColor: '#003366',
  },
  selectedGuestAccessItem: {
    backgroundColor: '#003366',
  },
  guestAccessTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  guestAccessDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  selectedGuestAccessText: {
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  boatContainer: {
    marginRight: '1%',
  },
  formGroup: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: 250,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    fontSize: 16,
    color: '#333',
  },
  dropdown: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    width: 250,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    maxHeight: 150,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedCountry: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  amountText: {
    fontSize: 18,
  },
  amountBtnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
  },
  guestAmountItem: {
    marginVertical: 10,
    alignItems: 'center',
  },
  roundButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#007AFF',
    marginHorizontal: 10,
  },
});

export default OnboardingHost;
