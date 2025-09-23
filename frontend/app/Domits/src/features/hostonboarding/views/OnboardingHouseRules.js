import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Switch, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useEffect, useState} from "react";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const OnboardingHouseRules = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [errorCheckin, setErrorCheckin] = useState("");
  const [errorCheckout, setErrorCheckout] = useState("");

  const [showCheckinFromModal, setShowCheckinFromModal] = useState(false);
  const [showCheckinTillModal, setShowCheckinTillModal] = useState(false);
  const [showCheckoutFromModal, setShowCheckoutFromModal] = useState(false);
  const [showCheckoutTillModal, setShowCheckoutTillModal] = useState(false);

  const ruleOptions = [
    {key: 'allowSmoking', label: 'Allow smoking'},
    {key: 'allowPets', label: 'Allow pets'},
    {key: 'allowParties', label: 'Allow parties'},
  ];

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

  const toggleRule = (ruleName) => {
    updateFormData((draft) => {
      const existingRule = draft.propertyRules.find(r => r.rule === ruleName);
      if (existingRule) {
        existingRule.value = !existingRule.value;
      } else {
        draft.propertyRules.push({
          rule: ruleName,
          value: true,
        });
      }
    });
  };

  const getRuleValue = (ruleName) => {
    const rule = formData.propertyRules.find(r => r.rule === ruleName);
    return rule?.value ?? false;
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

  const AllowSwitch = ({ruleName, value, onToggle, label}) => (
      <View style={styles.switchContainer}>
        <Text>
          <TranslatedText textToTranslate={label}/>
        </Text>
        <Switch
            value={value}
            onValueChange={() => onToggle(ruleName)}
        />
      </View>
  );

  useEffect(() => {
    markVisited(true);
  }, [])

  useEffect(() => {
    const checkinFromTime = timeStringToDate(formData.propertyCheckIn.checkIn.from);
    const checkinTillTime = timeStringToDate(formData.propertyCheckIn.checkIn.till);
    const checkoutFromTime = timeStringToDate(formData.propertyCheckIn.checkOut.from);
    const checkoutTillTime = timeStringToDate(formData.propertyCheckIn.checkOut.till);

    const checkinValid = checkinTillTime >= checkinFromTime;
    const checkoutValid = checkoutTillTime >= checkoutFromTime;

    setErrorCheckin(checkinValid ? '' : "'till' time must be after 'from' time.");
    setErrorCheckout(checkoutValid ? '' : "'till' time must be after 'from' time.");

    reportValidity(checkinValid && checkoutValid);
  }, [formData.propertyCheckIn.checkIn, formData.propertyCheckIn.checkOut]);

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

            {errorCheckin ?
                <Text style={styles.errorText}>
                  <TranslatedText textToTranslate={errorCheckin}/>
                </Text>
                : null
            }

            <Text style={styles.onboardingPageHeading1}>
              <TranslatedText textToTranslate={"Check-out times"}/>
            </Text>

            {TimePickerButton("From", formData.propertyCheckIn.checkOut.from, showCheckoutFromModal, setShowCheckoutFromModal, "checkOut", "from")}
            {TimePickerButton("Till", formData.propertyCheckIn.checkOut.till, showCheckoutTillModal, setShowCheckoutTillModal, "checkOut", "till")}

            {errorCheckout ?
                <Text style={styles.errorText}>
                  <TranslatedText textToTranslate={errorCheckout}/>
                </Text>
                : null
            }

            <Text style={styles.onboardingPageHeading1}>
              <TranslatedText textToTranslate={"General rules"}/>
            </Text>

            {ruleOptions.map(({key, label}) => (
                <AllowSwitch
                    key={key}
                    ruleName={key}
                    value={getRuleValue(key)}
                    onToggle={toggleRule}
                    label={label}
                />
            ))}

          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingHouseRules;