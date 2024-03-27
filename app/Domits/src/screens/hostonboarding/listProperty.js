import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Button,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

function ListProperty({navigation}) {
  const [roomType, setRoomType] = useState(undefined);
  const [travelers, setTravelers] = useState(undefined);
  const [bedrooms, setBedrooms] = useState(undefined);
  const [bathrooms, setBathrooms] = useState(undefined);
  const [beds, setBeds] = useState(undefined);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [currentPicker, setCurrentPicker] = useState(null);
  const [tempValue, setTempValue] = useState(null); // Temporary state for picker value


  // Define the list of options
  const options = {
    travelers: Array.from({length: 5}, (_, i) => `${i + 1}`),
    bedrooms: Array.from({length: 5}, (_, i) => `${i + 1}`),
    bathrooms: Array.from({length: 5}, (_, i) => `${i + 1}`),
    beds: Array.from({length: 5}, (_, i) => `${i + 1}`),
  };

  // Create an object that maps picker names to their state and setter
  const pickerState = {
    travelers: [travelers, setTravelers],
    bedrooms: [bedrooms, setBedrooms],
    bathrooms: [bathrooms, setBathrooms],
    beds: [beds, setBeds],
  };

  // Function to open the picker modal
  const openPicker = pickerName => {
    setCurrentPicker(pickerName);
    setPickerVisible(true);
  };

  // Function to handle value change from the picker
  const handleValueChange = itemValue => {
    const setValue = pickerState[currentPicker][1]; // Get the setter function for current picker
    setValue(itemValue); // Set the new value using the setter function
    setPickerVisible(false); // Close the picker modal
  };

  const handlePickerSelect = (itemValue) => {
    // Update temp value on picker scroll
    setTempValue(itemValue);
  };

  const handleDonePress = () => {
    // Update the actual value when "Done" is pressed and hide picker
    const setValue = pickerState[currentPicker][1];
    setValue(tempValue);
    setPickerVisible(false);
  };

  // Render the picker items
  const renderPickerItems = pickerName => {
    return options[pickerName].map(value => (
      <Picker.Item key={value} label={value} value={value} />
    ));
  };

  const navigateToLocationFillIn = () => {
    // Implement navigation logic using React Navigation
    // You may need to set up your navigation stack and screens accordingly
    navigation.navigate('LocationFillIn');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>Select room type</Text>
        <View style={styles.optionsContainer}>
          {['Entire house', 'Room', 'Shared room'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                roomType === type && styles.selectedOption,
              ]}
              onPress={() => setRoomType(type)}>
              <Text
                style={[
                  styles.optionText,
                  roomType === type && styles.selectedText,
                ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.title}>Define quantity</Text>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>How many travelers?</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => {
              setCurrentPicker('travelers');
              setPickerVisible(true);
            }}>
            <Text style={styles.dropdownText}>{travelers || 'Select'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>How many travelers?</Text>
          <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setCurrentPicker('bedrooms');
                setPickerVisible(true);
              }}>
            <Text style={styles.dropdownText}>{bedrooms || 'Select'}</Text>
          </TouchableOpacity>
        </View>

        <Modal
            transparent={true}
            animationType="slide"
            visible={isPickerVisible}
            onRequestClose={() => setPickerVisible(false)}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              {currentPicker && (
                  <Picker
                      selectedValue={pickerState[currentPicker][0]} // Keep current value
                      onValueChange={handlePickerSelect}
                      mode="dropdown">
                    {renderPickerItems(currentPicker)}
                  </Picker>
              )}
              <Button title="Done" onPress={handleDonePress} />
            </View>
          </View>
        </Modal>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerButton}>
            <Text style={styles.footerButtonText}>Previous step</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToLocationFillIn} style={styles.footerButton}>
            <Text style={styles.footerButtonText}>Next step</Text>
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
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    padding: 16,
  },
  optionsContainer: {
    paddingHorizontal: 16,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 16,
    marginBottom: 16,
    borderRadius: 4,
  },
  selectedOption: {
    backgroundColor: '#000',
  },
  optionText: {
    fontSize: 18,
  },
  selectedText: {
    color: '#FFF',
  },
  quantityContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  dropDownPicker: {
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  footerButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  footerButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  dropdownText: {
    fontSize: 18,
    textAlign: 'center',
  },
});

export default ListProperty;
