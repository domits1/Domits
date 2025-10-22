import {Image, Modal, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../../styles/HostOnboardingStyles";
import TranslatedText from "../../../translation/components/TranslatedText";
import Ionicons from "react-native-vector-icons/Ionicons";
import React from "react";

const CheckPhotosModal = ({label, formData, onClose}) => {
  const images = formData.localImages;

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
            <ScrollView persistentScrollbar={true} contentContainerStyle={[styles.imageSlider, {alignItems: 'center'}]}>
              {images.map((image) => (
                  <Image
                      resizeMode="contain"
                      resizeMethod="scale"
                      style={styles.image}
                      source={{uri: image.uri}}/>
              ))
              }
            </ScrollView>
          </View>
        </View>
      </Modal>
  )
}

export default CheckPhotosModal;