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

  const [country, setCountry] = useState(formData.propertyLocation.country);
  const [city, setCity] = useState(formData.propertyLocation.city);
  const [postalCode, setPostalCode] = useState(formData.propertyLocation.postalCode);
  const [street, setStreet] = useState(formData.propertyLocation.street);
  const [fullHouseNumber, setFullHouseNumber] = useState(formData.propertyLocation.houseNumber + formData.propertyLocation.houseNumberExtension);

  const [inputValidity, setInputValidity] = useState({
    country: false,
    city: false,
    postalCode: false,
    street: false,
    fullHouseNumber: false,
  })

  const updateInputStatus = (key, isValid) => {
    setInputValidity((prev) => ({
      ...prev,
      [key]: isValid,
    }));
  };

  const validateAndUpdate = (key, value, validator) => {
    const isValid = validator.test(value);
    if (isValid) {
      updateFormData((draft) => {
        draft.propertyLocation[key] = value;
      });
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
    validateAndUpdate('country', country, validators.string);
  }, [country]);

  useEffect(() => {
    validateAndUpdate('city', city, validators.string);
  }, [city]);

  useEffect(() => {
    validateAndUpdate('postalCode', postalCode, validators.postalCode);
  }, [postalCode]);

  useEffect(() => {
    validateAndUpdate('street', street, validators.string);
  }, [street]);

  useEffect(() => {
    if (validators.houseNumber.test(fullHouseNumber)) {
      const match = validators.houseNumber.exec(fullHouseNumber.trim());
      if (match) {
        const numberPart = parseInt(match[1], 10);
        const letterPart = match[2];
        updateFormData((draft) => {
          draft.propertyLocation.houseNumber = numberPart;
          draft.propertyLocation.houseNumberExtension = letterPart;
        })
      }
      updateInputStatus('fullHouseNumber', true)
    } else {
      updateInputStatus('fullHouseNumber', false)
    }
  }, [fullHouseNumber])

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Where can we find your accommodation?"}/>
          </Text>
          <Text style={styles.onboardingPageDescription}>
            <TranslatedText textToTranslate={"We only share your address with guests after they have booked."}/>
          </Text>
          <InputField
              label="Country"
              value={country}
              onChangeText={setCountry}
              isValid={inputValidity.country}
              maxLength={100}
          />
          <InputField
              label="City"
              value={city}
              onChangeText={setCity}
              isValid={inputValidity.city}
              maxLength={60}
          />
          <InputField
              label="Postal Code"
              value={postalCode}
              onChangeText={setPostalCode}
              isValid={inputValidity.postalCode}
              maxLength={30}
          />
          <InputField
              label="Street"
              value={street}
              onChangeText={setStreet}
              isValid={inputValidity.street}
              maxLength={80}
          />
          <InputField
              label="House number"
              value={fullHouseNumber}
              onChangeText={setFullHouseNumber}
              isValid={inputValidity.fullHouseNumber}
              maxLength={10}
          />
        </View>
      </ScrollView>

  )
}

export default OnboardingLocation;