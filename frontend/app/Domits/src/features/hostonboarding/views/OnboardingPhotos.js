import {launchImageLibrary} from 'react-native-image-picker';
import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Text, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React from "react";

const OnboardingPhotos = ({formData, updateFormData, reportValidity, markVisited}) => {

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Add photos of your property/"}/>
          </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>



          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingPhotos;