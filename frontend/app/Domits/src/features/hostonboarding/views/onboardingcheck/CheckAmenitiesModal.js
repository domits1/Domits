import {Modal, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../../styles/HostOnboardingStyles";
import TranslatedText from "../../../translation/components/TranslatedText";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";
import amenityUtils from "../../../../hooks/AmenityUtils";

const CheckAmenitiesModal = ({label, formData, onClose}) => {
  const amenitiesId = formData.propertyAmenities.map(item => item.amenityId);

  const AmenityItem = ({amenityId}) => {
    const amenityItem = amenityUtils.getAmenityById(amenityId);

    return (
        <View style={styles.amenityContainer}>
          {amenityItem.icon}
          <Text>
            <TranslatedText
                textToTranslate={amenityItem.amenity}/>
          </Text>
        </View>
    )
  }

  return (
      <Modal
          transparent={true}
          onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                <TranslatedText textToTranslate={label}/>
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name={'close-outline'} size={32}/>
              </TouchableOpacity>
            </View>
            <ScrollView persistentScrollbar={true}>
              {amenitiesId.map(id => (
                  <AmenityItem key={id} amenityId={id}/>
              ))
              }
            </ScrollView>
          </View>
        </View>
      </Modal>
  )
}

export default CheckAmenitiesModal;