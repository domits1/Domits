import {useTranslation} from "react-i18next";
import {useEffect, useState} from "react";
import {ScrollView, Text, TextInput, View} from "react-native";
import {styles} from "../styles/HostOnboardingStyles";
import TranslatedText from "../../translation/components/TranslatedText";

const InputField = ({label, value, onChangeText, isValid, maxLength}) => {
  const {t} = useTranslation();

  return (
      <View style={styles.inputItem}>
        <Text style={styles.inputTitle}>
          {t(label)}
          {!isValid && <Text> ❗</Text>}
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={t(label)}
              style={[styles.inputField, !isValid && styles.inputFieldError]}
              maxLength={maxLength}
          />
        </View>
      </View>
  );
};

const OnboardingLocation = ({formData, updateFormData, reportValidity, markVisited}) => {
  const validators = {
    string: /^[a-zA-Z\-\s]+$/,
    postalCode: /^[a-zA-Z0-9\- ]+$/,
    houseNumber: /^([1-9][0-9]*)([a-zA-Z]*)$/,
  };

  const [inputValidity, setInputValidity] = useState({
    country: validators.string.test(formData.propertyLocation.country),
    city: validators.string.test(formData.propertyLocation.city),
    postalCode: validators.postalCode.test(formData.propertyLocation.postalCode),
    street: validators.string.test(formData.propertyLocation.street),
    fullHouseNumber: validators.houseNumber.test(formData.propertyLocation.houseNumber + formData.propertyLocation.houseNumberExtension),
  })

  const locationOptions = [
    {key: "country", label: "Country", maxLength: 100, value: formData.propertyLocation.country},
    {key: "city", label: "City", maxLength: 60, value: formData.propertyLocation.city},
    {key: "postalCode", label: "Postal Code", maxLength: 30, value: formData.propertyLocation.postalCode},
    {key: "street", label: "Street", maxLength: 80, value: formData.propertyLocation.street},
    {key: "fullHouseNumber", label: "House number", maxLength: 10, value: formData.propertyLocation.houseNumber + formData.propertyLocation.houseNumberExtension}
  ];

  const updateInputStatus = (key, isValid) => {
    setInputValidity((prev) => ({
      ...prev,
      [key]: isValid,
    }));
  };

  const validateAndUpdate = (key, value) => {
    const isEmpty = value.trim() === '';
    let isValid = false;

    if (key === 'fullHouseNumber') {
      if (isEmpty) {
        updateFormData((draft) => {
          draft.propertyLocation.houseNumber = '';
          draft.propertyLocation.houseNumberExtension = '';
        })
      } else {
        const match = validators.houseNumber.exec(value.trim());
        if (match) {
          const numberPart = parseInt(match[1], 10);
          const letterPart = match[2];
          updateFormData((draft) => {
            draft.propertyLocation.houseNumber = numberPart;
            draft.propertyLocation.houseNumberExtension = letterPart;
          })
          isValid = true;
        }
      }
    } else {
      const validator = key === 'postalCode' ? validators.postalCode : validators.string;
      isValid = !isEmpty && validator.test(value);
      if (isEmpty || isValid) {
        updateFormData((draft) => {
          draft.propertyLocation[key] = isEmpty ? '' : value;
        });
      }
    }
    updateInputStatus(key, isValid);
  };

  useEffect(() => {
    markVisited(true);
  }, []);

  useEffect(() => {
    if (Object.values(inputValidity).every(Boolean)) {
      reportValidity(true);
    } else reportValidity(false);
  }, [inputValidity])

  useEffect(() => {
    setInputValidity({
      country: validators.string.test(formData.propertyLocation.country),
      city: validators.string.test(formData.propertyLocation.city),
      postalCode: validators.postalCode.test(formData.propertyLocation.postalCode),
      street: validators.string.test(formData.propertyLocation.street),
      fullHouseNumber: validators.houseNumber.test(
          formData.propertyLocation.houseNumber + formData.propertyLocation.houseNumberExtension
      ),
    });
  }, [formData.propertyLocation]);

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Where can we find your accommodation?"}/>
          </Text>
          <Text style={styles.onboardingPageDescription}>
            <TranslatedText textToTranslate={"We only share your address with guests after they have booked."}/>
          </Text>
          {locationOptions.map((item) => (
              <InputField
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  onChangeText={input => validateAndUpdate(item.key, input)}
                  isValid={inputValidity[item.key]}
                  maxLength={item.maxLength}
              />
          ))}
        </View>
      </ScrollView>
  )
}

export default OnboardingLocation;