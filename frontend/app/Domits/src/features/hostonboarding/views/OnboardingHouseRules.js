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

  const [checkinFromTime, setCheckinFromTime] = useState(new Date());
  const [checkinTillTime, setCheckinTillTime] = useState(new Date());
  const [checkoutTillTime, setCheckoutTillTime] = useState(new Date());
  const [checkoutFromTime, setCheckoutFromTime] = useState(new Date());

  const handleTimeChange = (field, value, subField = null) => {
    if (subField) {
      updateFormData(prevData => ({
        ...prevData,
        [field]: {
          ...prevData[field],
          [subField]: value,
        },
      }));
    } else {
      updateFormData(prevData => ({
        ...prevData,
        [field]: value,
      }));
    }
  };

  // const handleChange = (event, selectedTime) => {
  //   setShowTimeModal(false);
  //   if (selectedTime) {
  //     onTimeChange(selectedTime);
  //   }
  // };

  const showTimePicker = (label, time, onTimeChange) => {
    return (
        <View>
          <TranslatedText textToTranslate={label}/>
          <RNDateTimePicker
          value={time}
          mode={"time"}
          is24Hour={true}
          onChange={onTimeChange}
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

            <TouchableOpacity onPress={}>
              <TranslatedText textToTranslate={"from"}/>
              <Text>
                00:00
              </Text>
            </TouchableOpacity>

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