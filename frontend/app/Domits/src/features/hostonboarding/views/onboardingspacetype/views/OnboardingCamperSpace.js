import {Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import useOrientation from "../../../../../hooks/useOrientation";
import {useState} from "react";
import {styles} from "../../../styles/HostOnboardingStyles";
import TranslatedText from "../../../../translation/components/TranslatedText";

import camper_van from "../../../store/campericons/camper_van.png";
import sprinter_type from "../../../store/campericons/camper_van.png";
import cabover_motorhome from "../../../store/campericons/camper_van.png";
import semi_integrated_motorhome from "../../../store/campericons/camper_van.png";
import integrated_motorhome from "../../../store/campericons/camper_van.png";
import roof_tent from "../../../store/campericons/camper_van.png";
import other from "../../../store/campericons/camper_van.png";

const OnboardingCamperSpace = ({formData, updateFormData, reportValidity}) => {
  const {isLandscape} = useOrientation();
  const [selectedCamperSpace, setSelectedCamperSpace] = useState(formData.propertyType.propertySpace);

  const camperSpaceTypes = [
    {
      name: 'Campervan',
      img: camper_van
    },
    {
      name: 'Sprinter-type',
      img: sprinter_type
    },
    {
      name: 'Cabover motorhome',
      img: cabover_motorhome
    },
    {
      name: 'Semi-integrated motorhome',
      img: semi_integrated_motorhome
    },
    {
      name: 'Integrated motorhome',
      img: integrated_motorhome
    },
    {
      name: 'Roof tent',
      img: roof_tent
    },
    {
      name: 'Other',
      img: other
    },
  ];

  function handleSelectedCamperSpace(space) {
    setSelectedCamperSpace(space);
    updateFormData((draft) => {
      draft.propertyType.propertySpace = space;
    });
    reportValidity(true);
  }

  return (
      <SafeAreaView>
        <Text style={styles.onboardingPageTitle}>
          <TranslatedText textToTranslate={"What type of Camper do you own?"}/>
        </Text>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.gridItemContainer}>
            {camperSpaceTypes.map((item, index) => (
                <TouchableOpacity
                    onPress={() => handleSelectedCamperSpace(item.name)}
                    key={index}
                    style={[
                      styles.gridItem,
                      isLandscape ? {width: `20%`} : {width: `35%`},
                      selectedCamperSpace === item.name && styles.selectedGridItem
                    ]}>
                  <Image source={item.img} style={styles.gridItemImage}/>
                  <Text style={styles.gridItemText}>
                    <TranslatedText textToTranslate={item.name}/>
                  </Text>
                </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
  )
}

export default OnboardingCamperSpace;