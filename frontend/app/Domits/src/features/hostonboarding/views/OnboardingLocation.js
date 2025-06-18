import {useTranslation} from "react-i18next";
import {useState} from "react";
import {Text, TextInput, View} from "react-native";
import {styles} from "../styles/HostOnboardingStyles";
import TranslatedText from "../../translation/components/TranslatedText";

const OnboardingLocation = ({formData, updateFormData, reportValidity, markVisited}) => {
  const {t} = useTranslation();
  const [locationData, setLocationData] = useState({...formData.propertyLocation});

  //todo validate inputs
  const houseNumberRegex = /^([1-9][0-9]*)([a-zA-Z]*)$/;
  const validators = {
    string: /^[a-zA-Z\-\s]+$/,
    number: /^[0-9]+$/,
    postalCode: /^[A-Z0-9\-]+$/,
    houseNumber: /^[1-9](?:[a-zA-Z]+[a-zA-Z]*|\d*)$/,
  };

  const [country, setCountry] = useState(locationData.country);
  const [city, setCity] = useState(locationData.city);
  const [postalCode, setPostalCode] = useState(locationData.postalCode);
  const [street, setStreet] = useState(locationData.street);
  const [houseNumber, setHouseNumber] = useState(locationData.houseNumber);
  const [houseNumberExtension, setHouseNumberExtension] = useState(locationData.houseNumberExtension);

  //todo update formData
  function updateField(key, value) {
    setLocationData(prev => ({...prev, [key]: value}));
  }

  function setDividedHouseNumber(houseNumberString) {
    const match = houseNumberRegex.exec(houseNumberString.trim());

    if (match) {
      const numberPart = parseInt(match[1], 10);
      const letterPart = match[2];
      setHouseNumber(numberPart);
      setHouseNumberExtension(letterPart);
    } else {
      setHouseNumber('');
      setHouseNumberExtension('');
    }
  }

  const LabeledInput = ({label, value, onChangeText, placeholder, maxLength, error}) => (
      <View style={styles.inputItem}>
        <Text style={styles.inputTitle}>
          <TranslatedText textToTranslate={label}/>
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={t(placeholder)}
              style={styles.inputField}
              maxLength={maxLength}
          />
        </View>
      </View>
  );

  return (
      <View style={styles.contentContainer}>
        <Text style={styles.onboardingPageTitle}>
          <TranslatedText textToTranslate={"Where can we find your accommodation?"}/>
        </Text>
        <Text style={styles.onboardingPageDescription}>
          <TranslatedText textToTranslate={"We only share your address with guests after they have booked."}/>
        </Text>

        //todo Country dropdown list
        <LabeledInput
            label={"Country"}
            value={country}
            onChangeText={setCountry}
            placeholder={"i.e. The Netherlands"}
            maxLength={100}
        />
        <LabeledInput
            label={"Postal Code"}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder={"i.e. \"1234AB\""}
            maxLength={30}
        />
        <LabeledInput
            label={"Street"}
            value={street}
            onChangeText={setStreet}
            placeholder={"i.e. Example Street"}
            maxLength={85}
        />
        <LabeledInput
            label={"House Number"}
            value={houseNumber + houseNumberExtension}
            onChangeText={setDividedHouseNumber}
            placeholder={"i.e. \"123A\""}
            maxLength={10}
        />
        <LabeledInput
            label={"City"}
            value={city}
            onChangeText={setCity}
            placeholder={"Example City"}
            maxLength={60}
        />
      </View>
  )
}

export default OnboardingLocation;