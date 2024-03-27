import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import MapView from 'react-native-maps';

function FillInLocationScreen({navigation}) {
  const [inputs, setInputs] = useState({
    country: '',
    postalCode: '',
    street: '',
    neighbourhood: '',
  });

  const handleInputChange = (key, value) => {
    setInputs({...inputs, [key]: value});
  };

  const goToPreviousStep = () => navigation.goBack();
  const goToNextStep = () => navigation.navigate('NextStepScreenName');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.header}>Fill in location</Text>
        {Object.entries(inputs).map(([key, value], index) => (
          <View key={index} style={styles.inputContainer}>
            <Text style={styles.label}>{key}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={text => handleInputChange(key, text)}
              placeholder={key}
            />
          </View>
        ))}
        <Text style={styles.mapHeader}>What we show on Domits.com</Text>
        <MapView style={styles.map}

                 //moet nog wat gedaan worden voor de map.
        />
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
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#000',
  },
  input: {
    borderColor: '#000',
    borderWidth: 1,
    borderRadius: 4,
    padding: 15,
    fontSize: 16,
    color: '#000',
  },
  mapHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 32,
    marginBottom: 16,
  },
  map: {
    height: 200,
    borderRadius: 12,
  },
  buttonContainer: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    textAlign: 'center',
  },
});

export default FillInLocationScreen;
