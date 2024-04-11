import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const amenitiesData = [
  {key: 'wifi', name: 'WiFi', iconName: 'wifi'},
  {key: 'pool', name: 'Swimming Pool', iconName: 'swimming-pool'},
  {key: 'gym', name: 'Gym', iconName: 'dumbbell'},
  // Add more amenities as needed
];

const safetyData = [
  {key: 'smoke_detector', name: 'Smoke Detector', iconName: 'shield'},
  {
    key: 'fire_extinguisher',
    name: 'Fire Extinguisher',
    iconName: 'fire-extinguisher',
  },
  {key: 'first_aid_kit', name: 'First Aid Kit', iconName: 'first-aid'},
  // Add more safety measures as needed
];

function SelectAmenitiesScreen({navigation}) {
  const [selectedAmenities, setSelectedAmenities] = useState(new Set());
  const [selectedSafetyMeasures, setSelectedSafetyMeasures] = useState(
    new Set(),
  );

  const toggleAmenity = key => {
    const newSelectedAmenities = new Set(selectedAmenities);
    if (newSelectedAmenities.has(key)) {
      newSelectedAmenities.delete(key);
    } else {
      newSelectedAmenities.add(key);
    }
    setSelectedAmenities(newSelectedAmenities);
  };

  const toggleSafetyMeasure = key => {
    const newSelectedSafetyMeasures = new Set(selectedSafetyMeasures);
    if (newSelectedSafetyMeasures.has(key)) {
      newSelectedSafetyMeasures.delete(key);
    } else {
      newSelectedSafetyMeasures.add(key);
    }
    setSelectedSafetyMeasures(newSelectedSafetyMeasures);
  };

  // Placeholder functions for navigation
  const goToPreviousStep = () => navigation.goBack();

  const goToNextStep = () => {
    navigation.navigate('PriceProperty');
  };

  const renderAmenity = item => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => toggleAmenity(item.key)}>
      <Icon
        name={selectedAmenities.has(item.key) ? 'check-square-o' : 'square-o'}
        size={24}
        style={styles.icon}
      />
      <Text style={styles.itemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderSafetyMeasure = item => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => toggleSafetyMeasure(item.key)}>
      <Icon
        name={
          selectedSafetyMeasures.has(item.key) ? 'check-square-o' : 'square-o'
        }
        size={24}
        style={styles.icon}
      />
      <Text style={styles.itemText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.header}>Select available amenities</Text>
        {amenitiesData.map(renderAmenity)}
        <Text style={styles.header}>Select safety measures</Text>
        {safetyData.map(renderSafetyMeasure)}
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
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingVertical: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 24,
    marginRight: 16,
  },
  itemText: {
    fontSize: 18,
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

export default SelectAmenitiesScreen;
