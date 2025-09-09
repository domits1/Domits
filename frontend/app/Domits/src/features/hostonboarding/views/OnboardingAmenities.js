import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Text, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useEffect, useState} from "react";
import amenityUtils from "../../../hooks/AmenityUtils";
import CheckBox from "@react-native-community/checkbox";

const OnboardingAmenities = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [selected, setSelected] = useState([]);
  const amenityNames = ['Wi-Fi', 'TV with cable/satellite', 'Heating', 'Hot water', 'Bed linens', 'Toilet paper', 'Air conditioning', 'Towels', 'Extra pillows and blankets', 'Soap and shampoo']

  const displayedAmenities = amenityNames
      .map(amenityUtils.getAmenityByName)
      .filter(Boolean);

  const toggleAmenity = (name) => {
    setSelected(prev =>
        prev.includes(name)
            ? prev.filter(item => item !== name)
            : [...prev, name]
    );
  };

  const amenityCheckbox = (amenityName) => {
    const amenityItem = amenityUtils.getAmenityByName(amenityName);
    const isSelected = selected.includes(amenityName);

    return (
        <View style={styles.checkboxContainer}>
          <CheckBox
              disabled={false}
              value={isSelected}
              onValueChange={() => toggleAmenity(amenityName)}
          />
          {amenityItem.icon}
          <Text>
            <TranslatedText
                textToTranslate={amenityItem.amenity}/>
          </Text>
        </View>
    )
  }

  useEffect(() => {
    markVisited(true);
    reportValidity(true); // Checkboxes not mandatory
  }, [])

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"What amenities does your space offer?"}/>
          </Text>
          <Text style={styles.onboardingPageDescription}>
            <TranslatedText textToTranslate={"You can add more facilities after publishing your property."}/>
          </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>

            {displayedAmenities.map(amenityName =>
                amenityCheckbox(amenityName)
            )}

          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingAmenities;