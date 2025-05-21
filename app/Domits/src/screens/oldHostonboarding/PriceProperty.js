import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {HOST_REVIEW_PROPERTY_CHANGES_SCREEN} from "../../navigation/utils/NavigationNameConstants";

function PriceSettingScreen({route, navigation}) {
  const [price, setPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancelPolicy, setCancelPolicy] = useState('');
  const [guestType, setGuestType] = useState('');

  const goToPreviousStep = () => navigation.goBack();

  const goToNextStep = () => {
    const updatedListingData = {
      ...route.params.listingData,
      Rent: price,
      StartDate: startDate,
      EndDate: endDate,
      CancelPolicy: cancelPolicy,
      GuestType: guestType,
    };
    navigation.navigate(HOST_REVIEW_PROPERTY_CHANGES_SCREEN, {updatedListingData});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>Set Price and Availability</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Price per Night</Text>
          <TextInput
            style={styles.input}
            onChangeText={setPrice}
            value={price}
            keyboardType="numeric"
            placeholder="$"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Start Date</Text>
          <Text style={styles.description}>
            Enter the start date for availability (YYYY-MM-DD)
          </Text>
          <TextInput
            style={styles.input}
            onChangeText={setStartDate}
            value={startDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>End Date</Text>
          <Text style={styles.description}>
            Enter the end date for availability (YYYY-MM-DD)
          </Text>
          <TextInput
            style={styles.input}
            onChangeText={setEndDate}
            value={endDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cancellation Policy</Text>
          <Text style={styles.description}>
            Specify the cancellation policy for the listing
          </Text>
          <TextInput
            style={styles.input}
            onChangeText={setCancelPolicy}
            value={cancelPolicy}
            placeholder="e.g., Free cancellation within 24 hours"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Guest Type</Text>
          <Text style={styles.description}>
            Specify the type of guests allowed (e.g., families, business
            travelers)
          </Text>
          <TextInput
            style={styles.input}
            onChangeText={setGuestType}
            value={guestType}
            placeholder="e.g., Families, Business Travelers"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={goToPreviousStep}>
            <Text style={styles.buttonText}>Previous step</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={goToNextStep}>
            <Text style={styles.buttonText}>Next step</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PriceSettingScreen;
