import {Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/HostOnboardingStyles";
import TranslatedText from "../../translation/components/TranslatedText";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";

const OnboardingCheck = ({route, navigation}) => {
  const {formData} = route.params;

  const tableItem = (label, value) => {
    return (
        <View style={styles.tableItem}>
          <View style={styles.labelItem}>
            <Text style={styles.labelText}>
              <TranslatedText textToTranslate={label}/>
            </Text>
          </View>
          <View style={styles.valueItem}>
            <Text style={styles.valueText} numberOfLines={3}>
              <TranslatedText textToTranslate={value}/>
            </Text>
          </View>
        </View>
    )
  }

  return (
      <View>
        <View>
          <View style={styles.goBackToEditContainer}>
            <TouchableOpacity style={styles.goBackToEditButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back-outline" size={24} style={styles.goBackToEditIcon}/>
              <Text style={styles.goBackToEditText}>
                <TranslatedText textToTranslate={'Edit'}/>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={'Overview'}/>
          </Text>
          <Text style={styles.onboardingPageDescription}>
            <TranslatedText textToTranslate={'Review your property details.'}/>
          </Text>
        </View>
        <View style={styles.table}>
          {tableItem('Space', formData.propertyType.property_type)}
          {tableItem('Space type', formData.propertyType.spaceType)}
          {tableItem('Name', formData.property.title)}
          {tableItem('Description', formData.property.description)}
          {tableItem('Location',
              formData.propertyLocation.street + ' ' + formData.propertyLocation.houseNumber + formData.propertyLocation.houseNumberExtension + ',\n' +
              formData.propertyLocation.city + ',\n' +
              formData.propertyLocation.country
          )}
        </View>
        <View>
          {/*  todo checkboxes*/}
        </View>

        <View style={styles.completeButtonContainer}>
          {/*todo complete/send button*/}
          <TouchableOpacity style={styles.completeButton} onPress={navigation.goBack}>
            <Text style={styles.completeButtonText}>
              <TranslatedText textToTranslate={'Complete'}/>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  )
}

export default OnboardingCheck;