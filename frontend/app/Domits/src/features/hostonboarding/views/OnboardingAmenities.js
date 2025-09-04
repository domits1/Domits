import {styles} from "../styles/HostOnboardingStyles";
import {ScrollView, Text, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import {useEffect, useState} from "react";

const OnboardingAmenities = ({formData, updateFormData, reportValidity, markVisited}) => {
  const amenities = [
    { name: 'Wi-fi', icon: '' },
    { name: 'Tv with cable/satellite', icon: '' },
    { name: 'Heating', icon: ''},
    { name: 'Hot water', icon: ''},
    { name: 'Bed linens', icon: ''},
    { name: 'Toilet paper', icon: ''},
    { name: 'Air conditioning', icon: ''},
    { name: 'Towels', icon: ''},
    { name: 'Extra pillows and blankets', icon: ''},
    { name: 'Soap and shampoo', icon: ''},
  ];

  const [selected, setSelected] = useState([]);

  const toggleAmenity = (name) => {
    setSelected(prev =>
        prev.includes(name)
            ? prev.filter(item => item !== name)
            : [...prev, name]
    );
  };

  useEffect(() => {
    markVisited(true);
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

          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingAmenities;