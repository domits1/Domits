import {Modal, Pressable, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {styles} from '../styles/propertyDetailsStyles';
import React from 'react';
import TranslatedText from '../../../features/translation/components/TranslatedText';
import RenderAmenities from '../hooks/RenderAmenities';

const AmenitiesPopup = ({propertyAmenities, onClose}) => {
  return (
    <Modal
      transparent={true}
      visible={true}
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
          onPress={onClose}
          style={styles.modalOverlay}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✖</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            <TranslatedText
              textToTranslate={'What does this place have to offer?'}
            />
          </Text>
          <ScrollView>
            <RenderAmenities propertyAmenities={propertyAmenities} />
          </ScrollView>
        </View>
      </View>
      </Pressable>
    </Modal>
  );
};

export default AmenitiesPopup;
