import {Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {useEffect, useState} from "react";
import TranslatedText from "../../translation/components/TranslatedText";
import {styles} from "../styles/HostOnboardingStyles";

import apartmentImg from '../store/typeicons/apartment.png';
import boatImg from '../store/typeicons/boat.png';
import camperImg from '../store/typeicons/camper.png';
import cottageImg from '../store/typeicons/cottage.png';
import houseImg from '../store/typeicons/house.png';
import villaImg from '../store/typeicons/villa.png';
import useOrientation from "../../../hooks/useOrientation";

const OnboardingType = ({formData, updateFormData, reportValidity, markVisited}) => {
  const {isLandscape} = useOrientation();
  const [selectedType, setSelectedType] = useState(formData.propertyType.property_type);

  const propertyTypes = [
    {
      name: 'House',
      img: houseImg
    },
    {
      name: 'Villa',
      img: villaImg
    },
    {
      name: 'Cottage',
      img: cottageImg
    },
    {
      name: 'Apartment',
      img: apartmentImg
    },
    {
      name: 'Camper',
      img: camperImg
    },
    {
      name: 'Boat',
      img: boatImg
    },
  ];

  function handleSelectedType(type) {
    setSelectedType(type);
    updateFormData((draft) => {
      draft.propertyType.property_type = type;
    });
    reportValidity(true);
  }

  useEffect(() => {
    markVisited(true);
  }, []);

  return (
      <SafeAreaView style={styles.safeAreaNavMargin}>
        <Text style={styles.onboardingPageTitle}>
          <TranslatedText textToTranslate={"What best describes your property?"}/>
        </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.gridItemContainer}>
              {propertyTypes.map((item, index) => (
                  <TouchableOpacity
                      onPress={() => handleSelectedType(item.name)}
                      key={index}
                      style={[
                        styles.gridItem,
                        isLandscape ? {width: `20%`} : {width: `40%`},
                        selectedType === item.name && styles.selectedGridItem
                      ]}>
                    <Image source={item.img} style={styles.gridItemImage}/>
                    <Text style={[styles.gridItemText, selectedType === item.name && styles.selectedGridItemText]}>
                      <TranslatedText textToTranslate={item.name}/>
                    </Text>
                  </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
      </SafeAreaView>
  )
}

export default OnboardingType;