import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Text, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useState} from "react";
import CheckBox from "@react-native-community/checkbox";

const OnboardingHouseRules = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [allowSmoking, setAllowSmoking] = useState(false);
  const [allowPets, setAllowPets] = useState(false);
  const [allowParties, setAllowParties] = useState(false);

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