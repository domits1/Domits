import {FlatList, SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../../../translation/components/TranslatedText";
import {useEffect, useState} from "react";
import {styles} from "../../../styles/HostOnboardingStyles";
import useOrientation from "../../../../../hooks/useOrientation";

const OnboardingBoatSpace = ({formData, updateFormData, reportValidity}) => {
  const {isLandscape} = useOrientation();
  const [selectedSpace, setSelectedSpace] = useState(formData.propertyType.propertySpace);

  const boatSpaceTypes = [
    {
      name: 'Motorboat',
      img: ''
    },
    {
      name: 'Sailboat',
      img: ''
    },
    {
      name: 'Rigid Inflatable Boat (RIB)',
      img: ''
    },
    {
      name: 'Catamaran',
      img: ''
    },
    {
      name: 'Yacht',
      img: ''
    },
    {
      name: 'Barge',
      img: ''
    },
    {
      name: 'House boat',
      img: ''
    },
    {
      name: 'Jetski',
      img: ''
    },
    {
      name: 'Electric boat',
      img: ''
    },
    {
      name: 'Boat without license',
      img: ''
    },
  ];

  function handleSelectedSpace(space) {
    setSelectedSpace(space);
    updateFormData((draft) => {
      draft.propertyType.propertySpace = space;
    });
    reportValidity(true);
  }

  return (
      <SafeAreaView>
        <Text style={styles.onboardingPageTitle}>
          <TranslatedText textToTranslate={"What type of boat do you own?"}/>
        </Text>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.gridItemContainer}>
            {boatSpaceTypes.map((item, index) => (
                <TouchableOpacity
                    onPress={() => handleSelectedSpace(item.name)}
                    key={index}
                    style={[
                      styles.gridItem,
                      isLandscape ? {width: `20%`} : {width: `30%`},
                      selectedSpace === item.name && styles.selectedGridItem
                    ]}>
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

export default OnboardingBoatSpace;