import {FlatList, Image, SafeAreaView, Text, TouchableOpacity, View} from "react-native";
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
  const {dimensions} = useOrientation();

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

  const [selectedType, setSelectedType] = useState(formData.propertyType.property_type);

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
      <SafeAreaView>
        <Text style={styles.onboardingPageTitle}>
          <TranslatedText textToTranslate={"What best describes your property?"}/>
        </Text>
        <View style={styles.typeItemContainer}>
          <FlatList
              data={propertyTypes}
              numColumns={2}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({item}) => (
                  <TouchableOpacity
                      onPress={() => handleSelectedType(item)}
                      style={[
                        styles.typeItem,
                        {width: dimensions.window.width * 0.4},
                        selectedType?.name === item.name && styles.selectedTypeItem
                      ]}>
                    <Image source={item.img} style={styles.typeImage}/>
                    <Text style={styles.typeItemText}>
                      <TranslatedText textToTranslate={item.name}/>
                    </Text>
                  </TouchableOpacity>
              )}
          />
        </View>
      </SafeAreaView>
  )
}

export default OnboardingType;