import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import DropdownPicker from 'react-native-dropdown-picker';

function ListProperty({navigation}) {
  const [roomType, setRoomType] = useState(null);
  const [travelers, setTravelers] = useState(null);
  const [bedrooms, setBedrooms] = useState(null);
  const [bathrooms, setBathrooms] = useState(null);
  const [beds, setBeds] = useState(null);

  const [isTravelersOpen, setTravelersOpen] = useState(false);
  const [isBedroomsOpen, setBedroomsOpen] = useState(false);
  const [isBathroomsOpen, setBathroomsOpen] = useState(false);
  const [isBedsOpen, setBedsOpen] = useState(false);

  const quantityItems = Array.from({length: 10}, (_, i) => ({
    label: `${i + 1}`,
    value: i + 1,
  }));

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
            <DropdownPicker
                open={isTravelersOpen}
                value={travelers}
                items={quantityItems}
                setOpen={setTravelersOpen}
                setValue={setTravelers}
                dropDownContainerStyle={{...styles.dropDownPicker, zIndex: 6000}}
            />
          </View>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>How many bedrooms?</Text>
            <DropdownPicker
                open={isBedroomsOpen}
                value={bedrooms}
                items={quantityItems}
                setOpen={setBedroomsOpen}
                setValue={setBedrooms}
                dropDownContainerStyle={{...styles.dropDownPicker, zIndex: 5000}}
            />
          </View>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerButton}>
              <Text style={styles.footerButtonText}>Previous step</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton}>
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
    color:'#FFF',
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
});

export default ListProperty;
