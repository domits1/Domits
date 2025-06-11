import {SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {useState} from "react";
import {styles} from "../../../styles/HostOnboardingStyles";
import TranslatedText from "../../../../translation/components/TranslatedText";

const OnboardingAnySpace = ({formData, updateFormData, reportValidity}) => {
  const [selectedSpace, setSelectedSpace] = useState(formData.propertyType.propertySpace);

  const propertySpaceTypes = [
    {
      name: 'Entire house',
      description: 'Guests have the entire space to themselves.'
    },
    {
      name: 'Room',
      description: 'Guests have their own room in a house and share other spaces.'
    },
    {
      name: 'A shared room',
      description: 'Guests sleep in a room or common area that they may share with you or others.'
    }
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
          <TranslatedText textToTranslate={"What kind of space do your guests have access to?"}/>
        </Text>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.listItemContainer}>
            {propertySpaceTypes.map((item, index) => (
                <TouchableOpacity
                    onPress={() => {
                      handleSelectedSpace(item.name)
                    }}
                    key={index}
                    style={[
                      styles.listItem,
                      selectedSpace === item.name && styles.selectedListItem
                    ]}>
                  <Text style={[styles.listItemTitle, selectedSpace === item.name && styles.selectedItemText]}>
                    <TranslatedText textToTranslate={item.name}/>
                  </Text>
                  <Text style={[styles.listItemDescription, selectedSpace === item.name && styles.selectedItemText]}>
                    <TranslatedText textToTranslate={item.description}/>
                  </Text>
                </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

      </SafeAreaView>
  )
}

export default OnboardingAnySpace;