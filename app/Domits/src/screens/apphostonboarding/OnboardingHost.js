import React, {useMemo, useState} from 'react'
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
  Switch,
} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import Apartment from '../pictures/Onboarding-icons/flat.png'
import House from '../pictures/Onboarding-icons/house.png'
import Villa from '../pictures/Onboarding-icons/mansion.png'
import Boat from '../pictures/Onboarding-icons/house-boat.png'
import Camper from '../pictures/Onboarding-icons/camper-van.png'
import Cottage from '../pictures/Onboarding-icons/cottage.png'

import CamperVan from '../pictures/Onboarding-icons/camper-van.png'
import Motorboat from '../pictures/BoatTypes/motorboat.png'
import Sailboat from '../pictures/BoatTypes/sailboat.png'
import Rib from '../pictures/BoatTypes/rib.png'
import Catamaran from '../pictures/BoatTypes/catamaran.png'
import Yacht from '../pictures/BoatTypes/yacht.png'
import Barge from '../pictures/BoatTypes/barge.png'
import Houseboat from '../pictures/BoatTypes/house_boat.png'
import Jetski from '../pictures/BoatTypes/jetski.png'
import Electric_Boat from '../pictures/BoatTypes/electric-boat.png'
import Boat_Without_License from '../pictures/BoatTypes/boat-without-license.png'

import {Picker} from '@react-native-picker/picker'

const OnboardingHost = () => {
  const listingType = 0
  const listingSpaceType = 1
  const listingLocation = 2
  const listingAmountOfGuests = 3
  const listingAmenities = 4
  const listingHouseRules = 5
  const listingName = 6
  const listingDescription = 7
  const navigation = useNavigation()
  const [page, setPage] = useState(0)
  const [selectedAccoType, setSelectedAccoType] = useState(null)
  const [formData, setFormData] = useState({
    GuestAccess: '',
    BoatType: '',
    CamperType: '',
    GuestAmount: 0,
    Cabins: 0,
    Bedrooms: 0,
    Bathrooms: 0,
    Beds: 0,
    AllowSmoking: false,
    AllowPets: false,
    AllowParties: false,
    CheckIn: {From: '00:00', Til: '00:00'},
    CheckOut: {From: '00:00', Til: '00:00'},
    AccommodationTitle: '', // For listingName
    AccommodationDescription: '', // For listingDescription
  })
  const [errors, setErrors] = useState({})
  const [selectedCountry, setSelectedCountry] = useState('')
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
  ]
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const accoTypes = ['Apartment', 'House', 'Villa', 'Boat', 'Camper', 'Cottage']
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
  ]

  const camperTypes = [
    'Campervan',
    'Sprinter-Type',
    'Cabover Motorhome',
    'Semi-integrated Motorhome',
    'Integrated Motorhome',
    'Roof Tent',
    'Other',
  ]

  const accommodationIcons = {
    Apartment,
    House,
    Villa,
    Boat,
    Camper,
    Cottage,
  }

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
  }

  const allAmenities = {
    Essentials: [
      'Wi-Fi',
      'Air conditioning',
      'Heating',
      'TV with cable/satellite',
      'Hot water',
      'Towels',
      'Bed linens',
      'Extra pillows and blankets',
      'Toilet paper',
      'Soap and shampoo',
    ],
    Kitchen: [
      'Refrigerator',
      'Microwave',
      'Oven',
      'Stove',
      'Dishwasher',
      'Coffee maker',
      'Toaster',
      'Basic cooking essentials',
      'Dishes and silverware',
      'Glasses and mugs',
      'Cutting board and knives',
      'Blender',
      'Kettle',
    ],
    Bathroom: [
      'Hair dryer',
      'Shower gel',
      'Conditioner',
      'Body lotion',
      'First aid kit',
    ],
    Bedroom: [
      'Hangers',
      'Iron and ironing board',
      'Closet/drawers',
      'Alarm clock',
    ],
    LivingArea: [
      'Sofa',
      'Armchairs',
      'Coffee table',
      'Books and magazines',
      'Board games',
    ],
    Technology: [
      'Smart TV',
      'Streaming services',
      'Bluetooth speaker',
      'Universal chargers',
      'Work desk and chair',
    ],
    Safety: [
      'Smoke detector',
      'Carbon monoxide detector',
      'Fire extinguisher',
      'Lock on bedroom door',
    ],
    FamilyFriendly: [
      'High chair',
      'Crib',
      'Children’s books and toys',
      'Baby safety gates',
      'Baby bath',
      'Baby monitor',
    ],
    Laundry: ['Washer and dryer', 'Laundry detergent', 'Clothes drying rack'],
    Convenience: [
      'Keyless entry',
      'Self-check-in',
      'Local maps and guides',
      'Luggage drop-off allowed',
      'Parking space',
      'EV charger',
    ],
    Accessibility: [
      'Step-free access',
      'Wide doorways',
      'Accessible-height bed',
      'Accessible-height toilet',
      'Shower chair',
    ],
    ExtraServices: [
      'Cleaning service (add service fee manually)',
      'Concierge service',
      'Housekeeping',
      'Grocery delivery',
      'Airport shuttle',
      'Private chef',
      'Personal trainer',
      'Massage therapist',
    ],
    EcoFriendly: [
      'Recycling bins',
      'Energy-efficient appliances',
      'Solar panels',
      'Composting bin',
    ],
    Outdoor: [
      'Patio or balcony',
      'Outdoor furniture',
      'Grill',
      'Fire pit',
      'Pool',
      'Hot tub',
      'Garden or backyard',
      'Bicycle',
    ],
  }

  const handleSelectType = type => {
    setSelectedAccoType(type)
    setFormData({
      ...formData,
      BoatType: '', // Reset BoatType if a new type is selected
      CamperType: '', // Reset CamperType if a new type is selected
      GuestAccess: '', // Reset GuestAccess for other selections
    })
  }

  const handleSelectBoatType = boatType => {
    setFormData({
      ...formData,
      BoatType: boatType,
    })
  }

  const handleSelectCamperType = camperType => {
    setFormData({
      ...formData,
      CamperType: camperType,
    })
  }

  const handleSelectGuestAccess = guestAccess => {
    setFormData({
      ...formData,
      GuestAccess: guestAccess,
    })
  }

  const pageUpdater = pageNumber => {
    setPage(pageNumber)
  }

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen)
  }

  const selectCountry = country => {
    setSelectedCountry(country)
    setDropdownOpen(false)
  }

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }
  const [selectedAmenities, setSelectedAmenities] = useState({})

  const toggleAmenity = (category, amenity) => {
    setSelectedAmenities(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [amenity]: !prev[category]?.[amenity],
      },
    }))
  }
  const incrementAmount = field => {
    setFormData(prevData => ({
      ...prevData,
      [field]: prevData[field] + 1,
    }))
  }

  const decrementAmount = field => {
    if (formData[field] > 0) {
      setFormData(prevData => ({
        ...prevData,
        [field]: prevData[field] - 1,
      }))
    }
  }
  const handleHouseRulesChange = (field, value, subField = null) => {
    if (subField) {
      setFormData(prevData => ({
        ...prevData,
        [field]: {
          ...prevData[field],
          [subField]: value,
        },
      }))
    } else {
      setFormData(prevData => ({
        ...prevData,
        [field]: value,
      }))
    }
  }
  const renderPageContent = page => {
    switch (page) {
      case listingType:
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
        )
      case listingSpaceType:
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
        )
      case listingLocation:
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
        )
      case listingAmountOfGuests:
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
                  onPress={() => setPage(4)}>
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )
      case listingAmenities:
        return (
          <SafeAreaView style={styles.aminityContainer}>
            <ScrollView>
              <Text style={styles.title}>
                Let Guests Know What Your Space Offers
              </Text>
              {Object.keys(allAmenities).map(category => (
                <View key={category} style={styles.categoryContainer}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <View style={styles.amenitiesGrid}>
                    {allAmenities[category].map(amenity => (
                      <TouchableOpacity
                        key={amenity}
                        style={[
                          styles.amenityItem,
                          selectedAmenities[category]?.[amenity] &&
                            styles.amenityItemSelected,
                        ]}
                        onPress={() => toggleAmenity(category, amenity)}
                        activeOpacity={0.8}>
                        <Text
                          style={[
                            styles.amenityText,
                            selectedAmenities[category]?.[amenity] &&
                              styles.amenityTextSelected,
                          ]}>
                          {amenity}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setPage(3)}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setPage(5)}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )
      case listingHouseRules:
        return (
          <View style={styles.pageBody}>
            <Text style={styles.title}>House rules</Text>
            <View style={styles.toggleContainer}>
              <View style={styles.toggle}>
                <Text style={styles.toggleLabel}>Allow Smoking</Text>
                <Switch
                  value={formData.AllowSmoking}
                  onValueChange={value =>
                    handleHouseRulesChange('AllowSmoking', value)
                  }
                />
              </View>
              <View style={styles.toggle}>
                <Text style={styles.toggleLabel}>Allow Pets</Text>
                <Switch
                  value={formData.AllowPets}
                  onValueChange={value =>
                    handleHouseRulesChange('AllowPets', value)
                  }
                />
              </View>
              <View style={styles.toggle}>
                <Text style={styles.toggleLabel}>Allow Parties/Events</Text>
                <Switch
                  value={formData.AllowParties}
                  onValueChange={value =>
                    handleHouseRulesChange('AllowParties', value)
                  }
                />
              </View>
            </View>

            {/* Check-In Time */}
            <View style={styles.checkContainer}>
              <Text style={styles.checkInLabel}>Check-In</Text>
              <View style={styles.timePickerRow}>
                <Text style={styles.timePickerLabel}>From:</Text>
                <Picker
                  selectedValue={formData.CheckIn.From}
                  onValueChange={value =>
                    handleHouseRulesChange('CheckIn', value, 'From')
                  }
                  style={styles.picker}>
                  {Array.from({length: 24}, (_, i) => {
                    const time = `${i.toString().padStart(2, '0')}:00`
                    return <Picker.Item key={time} label={time} value={time} />
                  })}
                </Picker>
                <Text style={styles.timePickerLabel}>Til:</Text>
                <Picker
                  selectedValue={formData.CheckIn.Til}
                  onValueChange={value =>
                    handleHouseRulesChange('CheckIn', value, 'Til')
                  }
                  style={styles.picker}>
                  {Array.from({length: 24}, (_, i) => {
                    const time = `${i.toString().padStart(2, '0')}:00`
                    return <Picker.Item key={time} label={time} value={time} />
                  })}
                </Picker>
              </View>
            </View>

            {/* Check-Out Time */}
            <View style={styles.checkContainer}>
              <Text style={styles.checkLabel}>Check-Out</Text>
              <View style={styles.timePickerRow}>
                <Text style={styles.timePickerLabel}>From:</Text>
                <Picker
                  selectedValue={formData.CheckOut.From}
                  onValueChange={value =>
                    handleHouseRulesChange('CheckOut', value, 'From')
                  }
                  style={styles.picker}>
                  {Array.from({length: 24}, (_, i) => {
                    const time = `${i.toString().padStart(2, '0')}:00`
                    return <Picker.Item key={time} label={time} value={time} />
                  })}
                </Picker>
                <Text style={styles.timePickerLabel}>Til:</Text>
                <Picker
                  selectedValue={formData.CheckOut.Til}
                  onValueChange={value =>
                    handleHouseRulesChange('CheckOut', value, 'Til')
                  }
                  style={styles.picker}>
                  {Array.from({length: 24}, (_, i) => {
                    const time = `${i.toString().padStart(2, '0')}:00`
                    return <Picker.Item key={time} label={time} value={time} />
                  })}
                </Picker>
              </View>
            </View>

            <View style={styles.buttonContainerRules}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setPage(page - 1)}>
                <Text style={styles.buttonText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !(
                    formData.CheckIn?.From &&
                    formData.CheckIn?.Til &&
                    formData.CheckOut?.From &&
                    formData.CheckOut?.Til
                  ) && styles.disabledButton,
                ]}
                disabled={
                  !(
                    formData.CheckIn?.From &&
                    formData.CheckIn?.Til &&
                    formData.CheckOut?.From &&
                    formData.CheckOut?.Til
                  )
                }
                onPress={() => setPage(page + 1)}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      case listingName:
        return (
          <SafeAreaView style={styles.container}>
            <Text style={styles.title}>
              Provide a Title for Your Accommodation
            </Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Accommodation Title*</Text>
              <TextInput
                placeholder="Enter a title (e.g., Cozy Beachfront Villa)"
                value={formData.AccommodationTitle}
                onChangeText={value =>
                  handleInputChange('AccommodationTitle', value)
                }
                style={[
                  styles.input,
                  errors.AccommodationTitle && styles.errorInput,
                ]}
              />
              {errors.AccommodationTitle && (
                <Text style={styles.errorText}>
                  {errors.AccommodationTitle}
                </Text>
              )}
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setPage(page - 1)}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !formData.AccommodationTitle && styles.disabledButton,
                ]}
                onPress={() => {
                  if (formData.AccommodationTitle) {
                    setPage(page + 1)
                  } else {
                    setErrors(prevErrors => ({
                      ...prevErrors,
                      AccommodationTitle: 'Title is required',
                    }))
                  }
                }}
                disabled={!formData.AccommodationTitle}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )
      case listingDescription:
        return (
          <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Provide a Description</Text>
            <Text style={styles.subtitle}>
              Share what makes your accommodation special.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter your description here..."
              multiline
              maxLength={500}
              value={formData.AccommodationDescription}
              onChangeText={value =>
                handleInputChange('AccommodationDescription', value)
              }
            />
            <Text style={styles.charCounter}>
              {formData.AccommodationDescription.length}/500
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setPage(page - 1)}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !formData.AccommodationDescription && styles.disabledButton,
                ]}
                onPress={() => {
                  if (formData.AccommodationDescription) {
                    setPage(page + 1)
                  } else {
                    setErrors(prevErrors => ({
                      ...prevErrors,
                      AccommodationDescription: 'Description is required',
                    }))
                  }
                }}
                disabled={!formData.AccommodationDescription}>
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )
      case 8:
        return (
          <SafeAreaView style={styles.container}>
            <ScrollView>
              <Text style={styles.title}>Overview</Text>

              {/* Display selected accommodation type */}
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Accommodation Type:</Text>
                <Text style={styles.overviewValue}>
                  {selectedAccoType || 'N/A'}
                </Text>
              </View>

              {/* Display guest access or other related details */}
              {formData.GuestAccess && (
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>Guest Access:</Text>
                  <Text style={styles.overviewValue}>
                    {formData.GuestAccess}
                  </Text>
                </View>
              )}

              {/* Display guest amount */}
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Guest Amount:</Text>
                <Text style={styles.overviewValue}>{formData.GuestAmount}</Text>
              </View>

              {/* Display check-in and check-out times */}
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Check-In:</Text>
                <Text style={styles.overviewValue}>
                  From {formData.CheckIn?.From} to {formData.CheckIn?.Til}
                </Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Check-Out:</Text>
                <Text style={styles.overviewValue}>
                  From {formData.CheckOut?.From} to {formData.CheckOut?.Til}
                </Text>
              </View>

              {/* Display amenities if any */}
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Selected Amenities:</Text>
                <Text style={styles.overviewValue}>
                  {Object.entries(selectedAmenities)
                    .flatMap(([category, amenities]) =>
                      Object.entries(amenities)
                        .filter(([amenity, isSelected]) => isSelected)
                        .map(([amenity]) => amenity),
                    )
                    .join(', ') || 'None'}
                </Text>
              </View>

              {/* Display the entered accommodation title */}
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Accommodation Title:</Text>
                <Text style={styles.overviewValue}>
                  {formData.AccommodationTitle || 'N/A'}
                </Text>
              </View>

              {/* Display the description */}
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Description:</Text>
                <Text style={styles.overviewValue}>
                  {formData.AccommodationDescription || 'N/A'}
                </Text>
              </View>
            </ScrollView>

            {/* Finish Button */}
            <View style={styles.buttonContainerOverview}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setPage(page - 1)}>
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.finishButton}
                onPress={() => navigation.navigate('HostDashboard')}>
                <Text style={styles.buttonText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )
      default:
        return null
    }
  }

  return <View style={styles.container}>{renderPageContent(page)}</View>
}

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
  amenityContainer: {
    backgroundColor: 'white',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amenityItem: {
    width: '46%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityItemSelected: {
    backgroundColor: '#003366',
  },
  amenityText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  amenityTextSelected: {
    color: '#fff',
  },
  pageBody: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  toggleContainer: {
    marginVertical: 16,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
  },
  checkContainer: {
    marginVertical: 3,
  },
  checkLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 150,
  },
  checkInLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: -10,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
    marginTop: 150,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -120,
    width: '100%',
  },
  buttonContainerRules: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 150,
    marginLeft: '10%',
    width: '80%',
  },
  textArea: {
    width: '90%',
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top', // Ensures the text starts at the top
  },
  charCounter: {
    alignSelf: 'flex-end',
    marginRight: '5%',
    fontSize: 14,
    color: '#666',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 10,
  },
  overviewItem: {
    marginBottom: 15,
    marginRight: '40%',
  },
  overviewLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  overviewValue: {
    fontSize: 16,
    color: '#333',
  },
  finishButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#28a745',
    borderRadius: 8,
    width: '50%',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 1,
  },
  buttonContainerOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginLeft: '10%',
    width: '80%',
  },
})

export default OnboardingHost
