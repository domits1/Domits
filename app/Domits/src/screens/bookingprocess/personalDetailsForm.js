import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const BookingScreen = ({navigation}) => {

  const handleButton = () => {
    navigation.navigate('finalBookingOverview');
  };
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Kinderhuissingel 6k</Text>
        <Text style={styles.description}>
          Fantastic villa with private swimming pool and surrounded by beautiful
          parks.
        </Text>

        <View style={styles.bookingInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoTitle}>Booking overview</Text>
            <Text style={styles.infoDate}>05/12/2023 - 08/12/2023</Text>
            <View style={styles.infoDetail}>
              <Text style={styles.detailKey}>Main booker</Text>
              <Text style={styles.detailValue}>Lotte Zomer</Text>
            </View>
            <View style={styles.infoDetail}>
              <Text style={styles.detailKey}>Amount of Travellers</Text>
              <Text style={styles.detailValue}>2 adults - 2 kids</Text>
            </View>
            <View style={styles.infoDetail}>
              <Text style={styles.detailKey}>Email address</Text>
              <Text style={styles.detailValue}>lotte.summer@gmail.com</Text>
            </View>
            <View style={styles.infoDetail}>
              <Text style={styles.detailKey}>Phone number</Text>
              <Text style={styles.detailValue}>+31 6 12345678</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm email address</Text>
            <TextInput style={styles.inputField} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Telephone number</Text>
            <TextInput style={styles.inputField} keyboardType="phone-pad" />
          </View>

          <View style={styles.checkboxGroup}>
            <Icon name="checkmark-circle-outline" size={24} color="#4CAF50" />
            <Text style={styles.checkboxText}>I have read the house rules</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special custom requests</Text>
            <TextInput
              style={[styles.inputField, styles.inputArea]}
              multiline
            />
          </View>

          <TouchableOpacity onPress={handleButton} style={styles.button}>
            <Text style={styles.buttonText}>Cost overview</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    marginVertical: 16,
  },
  description: {
    fontSize: 16,
    color: '#6e6e6e',
    marginBottom: 24,
  },
  bookingInfo: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    paddingBottom: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoDate: {
    fontSize: 16,
    color: '#6e6e6e',
    marginBottom: 16,
  },
  infoDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailKey: {
    color: '#6e6e6e',
    fontSize: 16,
  },
  detailValue: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  }, // <--- This was missing
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#6e6e6e',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  inputArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6e6e6e',
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BookingScreen;
