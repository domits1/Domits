import {styles} from "../styles/HostOnboardingStyles";
import {SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import {useEffect, useState} from "react";
import Ionicons from "react-native-vector-icons/Ionicons";

const OnboardingAmountOfGuests = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [error, setError] = useState('');
  const [counter, setCounter] = useState(
      {
        Guests: 0,
        Beds: 0,
        Bedrooms: 0,
        Bathrooms: 0,
      }
  );

  const updateAmount = (field, delta) => {
    setCounter(prev => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta),
    }));
  };

  const updateCount = (field, delta) => {
    setCounter(prev => ({
      ...prev,
      [field]: Math.max(0, delta),
    }));
  };

  useEffect(() => {
    markVisited(true);
  }, [])

  // Update counter from formData
  useEffect(() => {
    const updatedCounter = {};
    formData.propertyGeneralDetails.forEach((item) => {
      updatedCounter[item.detail] = item.value;
    });
    setCounter(updatedCounter);
  }, []);

  useEffect(() => {
    const detailsToUpdate = Object.keys(counter);

    if (counter.Guests < 1) {
      setError('At least 1 guests must be accommodated.');
      reportValidity(false);
    } else {
      setError('');
      updateFormData((draft) => {
        detailsToUpdate.forEach((key) => {
          const item = draft.propertyGeneralDetails.find(
              (detailItem) => detailItem.detail === key
          );
          if (item) {
            item.value = counter[key];
          } else {
            draft.propertyGeneralDetails.push({
              detail: key,
              value: counter[key]
            });
          }
        })
      })
      reportValidity(true);
    }
  }, [counter]);


  const counterItem = (label, key) => {
    return (
        <View style={styles.counterItemContainer}>
          <View style={styles.counterLabel}>
            <Text style={styles.counterLabelText}>
              <TranslatedText textToTranslate={label}/>
            </Text>
          </View>

          <View style={styles.counterGroup}>
            <TouchableOpacity style={styles.counterGroupItem} onPress={() => updateAmount(key, +1)}>
              <Ionicons name="add-circle-outline" size={40}></Ionicons>
            </TouchableOpacity>
            <View style={styles.counterGroupItem}>
              <TextInput
                  style={styles.numericInput}
                  keyboardType={"number-pad"}
                  inputMode={"numeric"}
                  value={counter[key].toString()}
                  onChangeText={(newCount) => {
                    // Only allow digits
                    if (/^\d*$/.test(newCount)) {
                      updateCount(key, newCount);
                    }
                  }}
              />
            </View>
            <TouchableOpacity style={styles.counterGroupItem} onPress={() => updateAmount(key, -1)}>
              <Ionicons name="remove-circle-outline" size={40}></Ionicons>
            </TouchableOpacity>
          </View>
        </View>
    )
  }

  return (
      <SafeAreaView style={styles.safeAreaNavMargin}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"How many people can stay here?"}/>
          </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>

            <View style={styles.counterGroupContainer}>
            {counterItem('Guest(s)', 'Guests')}
            {counterItem('Bed(s)', 'Beds')}
            {counterItem('Bedroom(s)', 'Bedrooms')}
            {counterItem('Bathroom(s)', 'Bathrooms')}
            </View>

          </ScrollView>
          {error ?
              <Text style={styles.errorText}>
                <TranslatedText textToTranslate={error}/>
              </Text>
              : null
          }
        </View>
      </SafeAreaView>
  )
}

export default OnboardingAmountOfGuests;