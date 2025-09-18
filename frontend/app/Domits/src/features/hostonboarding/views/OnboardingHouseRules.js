import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useEffect, useState} from "react";
import CheckBox from "@react-native-community/checkbox";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const OnboardingHouseRules = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [showCheckinFromModal, setShowCheckinFromModal] = useState(false);
  const [showCheckinTillModal, setShowCheckinTillModal] = useState(false);
  const [showCheckoutFromModal, setShowCheckoutFromModal] = useState(false);
  const [showCheckoutTillModal, setShowCheckoutTillModal] = useState(false);

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

  const handleTimeChange = ((event, selectedDate, field, subField, setModalVisible) => {
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

      setModalVisible(false);
    }
  });

  const timePickerModal = (timeString, field, subfield, setModalVisible) => {
    const dateTime = timeStringToDate(timeString);

    return (
        <View>
          <RNDateTimePicker
              value={dateTime}
              mode={"time"}
              display={"spinner"}
              is24Hour={true}
              onChange={(event, date) => handleTimeChange(event, date, field, subfield, setModalVisible)}
          />
        </View>
    )
  }

  const TimePickerButton = (label, value, modalVisible, setModalVisible, field, subField) => (
      <View>
        <TouchableOpacity style={styles.timeSlotItem} onPress={() => setModalVisible(!modalVisible)}>
          <TranslatedText textToTranslate={label}/>
          <Text>{": "}</Text>
          <View style={styles.timeItem}>
            <Text>{value}</Text>
          </View>
          <MaterialCommunityIcons name="pencil" size={24}/>
        </TouchableOpacity>
        {modalVisible && timePickerModal(value, field, subField, setModalVisible)}
      </View>
  );

  const AllowCheckBox = ({changeFunction, checkedValue, text}) => (
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
  );

  useEffect(() => {
    markVisited(true);
  }, [])

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Set your house rules."}/>
          </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>

            <Text style={styles.onboardingPageHeading1}>
              <TranslatedText textToTranslate={"Check-in times"}/>
            </Text>

            {TimePickerButton("From", formData.propertyCheckIn.checkIn.from, showCheckinFromModal, setShowCheckinFromModal, "checkIn", "from")}
            {TimePickerButton("Till", formData.propertyCheckIn.checkIn.till, showCheckinTillModal, setShowCheckinTillModal, "checkIn", "till")}

            <Text style={styles.onboardingPageHeading1}>
              <TranslatedText textToTranslate={"Check-out times"}/>
            </Text>

            {TimePickerButton("From", formData.propertyCheckIn.checkOut.from, showCheckoutFromModal, setShowCheckoutFromModal, "checkOut", "from")}
            {TimePickerButton("Till", formData.propertyCheckIn.checkOut.till, showCheckoutTillModal, setShowCheckoutTillModal, "checkOut", "till")}

            <Text style={styles.onboardingPageHeading1}>
              <TranslatedText textToTranslate={"General rules"}/>
            </Text>

            <AllowCheckBox
                changeFunction={setAllowSmoking}
                checkedValue={allowSmoking}
                text="Allow smoking"
            />
            <AllowCheckBox
                changeFunction={setAllowPets}
                checkedValue={allowPets}
                text="Allow pets"
            />
            <AllowCheckBox
                changeFunction={setAllowParties}
                checkedValue={allowParties}
                text="Allow parties"
            />

          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingHouseRules;