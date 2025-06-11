import {Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../../../translation/components/TranslatedText";
import {useState} from "react";
import {styles} from "../../../styles/HostOnboardingStyles";
import useOrientation from "../../../../../hooks/useOrientation";

import barge from "../../../store/boaticons/barge.png";
import boat_without_license from "../../../store/boaticons/boat_without_license.png";
import catamaran from "../../../store/boaticons/catamaran.png";
import electric_boat from "../../../store/boaticons/electric_boat.png";
import house_boat from "../../../store/boaticons/house_boat.png";
import jetski from "../../../store/boaticons/jetski.png";
import motorboat from "../../../store/boaticons/motorboat.png";
import rib from "../../../store/boaticons/rib.png";
import sailboat from "../../../store/boaticons/sailboat.png";
import yacht from "../../../store/boaticons/yacht.png";

const OnboardingBoatSpace = ({formData, updateFormData, reportValidity}) => {
  const {isLandscape} = useOrientation();
  const [selectedBoatSpace, setSelectedBoatSpace] = useState(formData.propertyType.propertySpace);

  const boatSpaceTypes = [
    {
      name: 'Motorboat',
      img: motorboat
    },
    {
      name: 'Sailboat',
      img: sailboat
    },
    {
      name: 'Rigid Inflatable Boat (RIB)',
      img: rib
    },
    {
      name: 'Catamaran',
      img: catamaran
    },
    {
      name: 'Yacht',
      img: yacht
    },
    {
      name: 'Barge',
      img: barge
    },
    {
      name: 'House boat',
      img: house_boat
    },
    {
      name: 'Jetski',
      img: jetski
    },
    {
      name: 'Electric boat',
      img: electric_boat
    },
    {
      name: 'Boat without license',
      img: boat_without_license
    },
  ];

  function handleSelectedBoatSpace(space) {
    setSelectedBoatSpace(space);
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
                    onPress={() => handleSelectedBoatSpace(item.name)}
                    key={index}
                    style={[
                      styles.gridItem,
                      isLandscape ? {width: `20%`} : {width: `30%`},
                      selectedBoatSpace === item.name && styles.selectedGridItem
                    ]}>
                  <Image source={item.img} style={styles.gridItemImage}/>
                  <Text style={[styles.gridItemText, selectedBoatSpace === item.name && styles.selectedItemText]}>
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