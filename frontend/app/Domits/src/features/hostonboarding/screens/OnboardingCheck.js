import {Linking, SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../styles/HostOnboardingStyles";
import TranslatedText from "../../translation/components/TranslatedText";
import Ionicons from "react-native-vector-icons/Ionicons";
import React, {useEffect, useState} from "react";
import CheckBox from "@react-native-community/checkbox";
import CheckTextModal from "../views/onboardingcheck/CheckTextModal";
import CheckPhotosModal from "../views/onboardingcheck/CheckPhotosModal";
import CheckAmenitiesModal from "../views/onboardingcheck/CheckAmenitiesModal";

const OnboardingCheck = ({route, navigation}) => {
  const {formData} = route.params;
  const [toggleComplianceCheckBox, setToggleComplianceCheckBox] = useState(false);
  const [toggleTermsConditionsCheckBox, setToggleTermsConditionsCheckBox] = useState(false);
  const [areCheckboxesChecked, setAreCheckboxesChecked] = useState(false);

  const propertyGeneralDetailsString = () => {
    return formData.propertyGeneralDetails
        .map(item => `${item.detail}: ${item.value}`)
        .join('\n');
  };

  const propertyHouseRulesString = () => {
    return formData.propertyRules
        .map(item => `${item.rule.replace('allow', '')}: ${item.value ? '✔' : '✖'}`)
        .join('\n')
  };

  useEffect(() => {
    setAreCheckboxesChecked(toggleComplianceCheckBox && toggleTermsConditionsCheckBox);
  }, [toggleComplianceCheckBox, toggleTermsConditionsCheckBox])

  const tableItem = (label, value, modalComponent = null) => {
    const [showModal, setShowModal] = useState(false);
    const Modal = modalComponent;

    return (
        <View style={styles.tableItem}>
          <View style={styles.labelItem}>
            <Text style={styles.labelText}>
              <TranslatedText textToTranslate={label}/>
            </Text>
          </View>
          <TouchableOpacity disabled={modalComponent == null} style={styles.valueItem} onPress={() => setShowModal(!showModal)}>
              <Text style={styles.valueText} numberOfLines={4}>
                <TranslatedText textToTranslate={value}/>
              </Text>
          </TouchableOpacity>

          {showModal && modalComponent && (
              <Modal
                  label={label}
                  value={value}
                  formData={formData}
                  onClose={() => setShowModal(false)}
              />
          )}
        </View>
    )
  }

  return (
      <SafeAreaView style={styles.safeAreaNavMargin}>
        <View style={styles.contentContainer}>
          <ScrollView persistentScrollbar={true} contentContainerStyle={styles.scrollContainer}>

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
              {tableItem('Location',
                  formData.propertyLocation.street + ' ' + formData.propertyLocation.houseNumber + formData.propertyLocation.houseNumberExtension + ',\n' +
                  formData.propertyLocation.postalCode + ',\n' +
                  formData.propertyLocation.city + ',\n' +
                  formData.propertyLocation.country
              )}
              {tableItem('Description', formData.property.description, CheckTextModal)}
              {tableItem('General details', propertyGeneralDetailsString())}
              {tableItem('Amenities', 'Tap to see amenities', CheckAmenitiesModal)}
              {tableItem('Check-in', formData.propertyCheckIn.checkIn.from + " - " + formData.propertyCheckIn.checkIn.till)}
              {tableItem('Check-out', formData.propertyCheckIn.checkOut.from + " - " + formData.propertyCheckIn.checkOut.till)}
              {tableItem('House Rules', propertyHouseRulesString())}
              {tableItem('Photos', 'Tap to see images', CheckPhotosModal)}
            </View>

            <View>
              <View style={styles.checkboxContainer}>
                <CheckBox
                    disabled={false}
                    value={toggleComplianceCheckBox}
                    onValueChange={(newValue) => setToggleComplianceCheckBox(newValue)}
                />
                <Text>
                  <TranslatedText
                      textToTranslate={'I declare that this property is legitimate, complete with required licenses and permits, which can be displayed upon request. Domits B.V. reserves the right to verify and investigate your registration information.'}/>
                </Text>
              </View>
              <View style={styles.checkboxContainer}>
                <CheckBox
                    disabled={false}
                    value={toggleTermsConditionsCheckBox}
                    onValueChange={(newValue) => setToggleTermsConditionsCheckBox(newValue)}
                />
                <Text>
                  <TranslatedText textToTranslate={'I confirm that I have read and accept the '}/>
                  <Text
                      style={{color: 'blue', textDecorationLine: 'underline'}}
                      onPress={() => Linking.openURL('https://www.domits.com/terms')}>
                    <TranslatedText textToTranslate={'General Terms and Conditions'}/>
                  </Text>.
                </Text>
              </View>
            </View>

            <View style={styles.completeButtonContainer}>
              {/*todo complete/send button*/}
              <TouchableOpacity
                  disabled={!areCheckboxesChecked}
                  style={[styles.completeButton, !areCheckboxesChecked && {backgroundColor: 'rgb(128,128,128)'}]}
                  onPress={() => console.log('pressed complete')}>
                <Text style={styles.completeButtonText}>
                  <TranslatedText textToTranslate={'Complete'}/>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
  )
}

export default OnboardingCheck;