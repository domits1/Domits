import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Text, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useEffect, useState} from "react";
import amenityUtils from "../../../hooks/AmenityUtils";
import CheckBox from "@react-native-community/checkbox";

const OnboardingAmenities = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [selected, setSelected] = useState([]);
  const amenityNames = ['Wi-Fi', 'TV with cable/satellite', 'Heating', 'Hot water', 'Bed linens', 'Toilet paper', 'Air conditioning', 'Towels', 'Extra pillows and blankets', 'Soap and shampoo']

  const toggleAmenity = (amenityId) => {
    setSelected(prev => {
      const isSelected = prev.includes(amenityId);

      // Update form data based on selection
      updateFormData((draft) => {
        if (isSelected) {
          draft.propertyAmenities = draft.propertyAmenities.filter(item => item.amenityId !== amenityId);
        } else {
          draft.propertyAmenities.push({
            amenityId: amenityId,
          });
        }
      });

      return isSelected
          ? prev.filter(item => item !== amenityId)
          : [...prev, amenityId];
    });
  };

  const amenityCheckbox = (amenityName) => {
    const amenityItem = amenityUtils.getAmenityByName(amenityName);
    const isSelected = selected.includes(amenityItem.id);

    return (
        <View style={styles.checkboxContainer}>
          <CheckBox
              disabled={false}
              value={isSelected}
              onValueChange={() => toggleAmenity(amenityItem.id)}
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

  useEffect(() => {
    // Set initial selected
    setSelected(formData.propertyAmenities.map(item => item.amenityId));
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

            {amenityNames.map(amenityName =>
                amenityCheckbox(amenityName)
            )}

          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingAmenities;