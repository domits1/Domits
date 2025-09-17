import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useState} from "react";
import CheckBox from "@react-native-community/checkbox";
import RNDateTimePicker from "@react-native-community/datetimepicker";

const OnboardingHouseRules = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [showTimeModal, setShowTimeModal] = useState(false);

  const [allowSmoking, setAllowSmoking] = useState(false);
  const [allowPets, setAllowPets] = useState(false);
  const [allowParties, setAllowParties] = useState(false);

  const timeStringToDate = (timeStr) => {
    // From HH:mm
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  };

  const dateToTimeString = (date) => {
    // To HH:mm
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (event, selectedDate, field, subField) => {
    if (event.type === 'set' && selectedDate) {
      const timeStr = dateToTimeString(selectedDate);

      updateFormData(prevData => ({
        ...prevData,
        propertyCheckIn: {
          ...prevData.propertyCheckIn,
          [field]: {
            ...prevData.propertyCheckIn[field],
            [subField]: timeStr,
          }
        }
      }));

      setShowTimeModal(false);
    }
  }

  const timePickerModal = (timeString, field, subfield) => {
    const dateTime = timeStringToDate(timeString);

    return (
        <View>
          <RNDateTimePicker
              value={dateTime}
              mode={"time"}
              display={"spinner"}
              is24Hour={true}
              onChange={(event, date) => handleTimeChange(event, date, field, subfield)}
          />
        </View>
    )
  }

  const AllowCheckBox = (changeFunction, checkedValue, text) => {
    return (
        <View style={styles.checkboxContainer}>
          <CheckBox
              disabled={false}
              value={checkedValue}
              onValueChange={() => changeFunction(!checkedValue)}
          />
          <Text>
            <TranslatedText
                textToTranslate={text}/>
          </Text>
        </View>
    )
  }

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Set your house rules."}/>
          </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <Text style={styles.onboardingPageDescription}>
              <TranslatedText textToTranslate={"Check-in/-out"}/>
            </Text>

            <TouchableOpacity onPress={() => setShowTimeModal(!showTimeModal)}>
              <Text>
                from: {formData.propertyCheckIn.checkIn.from}
              </Text>
            </TouchableOpacity>

            {showTimeModal &&
                timePickerModal(formData.propertyCheckIn.checkIn.from, "checkIn", "from")
            }

            <Text style={styles.onboardingPageDescription}>
              <TranslatedText textToTranslate={"General rules"}/>
            </Text>

            {AllowCheckBox(setAllowSmoking, allowSmoking, "Allow smoking")}
            {AllowCheckBox(setAllowPets, allowPets, "Allow pets")}
            {AllowCheckBox(setAllowParties, allowParties, "Allow parties")}

          </ScrollView>
        </View>
      </ScrollView>

  )

}

export default OnboardingHouseRules;