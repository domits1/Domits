import React, {useEffect, useState} from "react";
import {ScrollView, Text, TextInput, View} from "react-native";
import {styles} from "../styles/HostOnboardingStyles";
import TranslatedText from "../../translation/components/TranslatedText";
import {useTranslation} from "react-i18next";

const onboardingRegistrationNumber = ({formData, updateFormData, reportValidity, markVisited}) => {
  const {t} = useTranslation();
  const [registrationNumber, setRegistrationNumber] = useState(formData.property.registrationNumber);

  useEffect(() => {
    if (registrationNumber.length > 1){
      updateFormData((draft) => {
        draft.property.registrationNumber = registrationNumber;
      })
      reportValidity(true);
    } else reportValidity(false)
  },[registrationNumber])

  useEffect(() => {
    markVisited(true);
  }, [])
  return (
    <ScrollView style={{flex: 1}}>
      <View style={styles.contentContainer}>
        <Text style={styles.onboardingPageTitle}>
          <TranslatedText textToTranslate={"Provide your property registration number"}/>:
        </Text>
        <Text style={styles.onboardingPageDescription}>
          <TranslatedText textToTranslate={"This is required to create a property"}/>
        </Text>
        <View style={styles.inputContainerCenter}>
          <TextInput
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            placeholder={t("Registration Number")}
            style={styles.inputField}
            multiline={true}
          />
        </View>
      </View>
    </ScrollView>
  );
}

export default onboardingRegistrationNumber;