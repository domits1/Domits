import {Modal, Text, TouchableOpacity, View} from "react-native";
import {styles} from "../../styles/HostOnboardingStyles";
import React from "react";
import TranslatedText from "../../../translation/components/TranslatedText";
import Ionicons from "react-native-vector-icons/Ionicons";

const CheckTextModal = ({label, value, onClose}) => {

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
            <Text>
              {value}
            </Text>
          </View>
        </View>
      </Modal>
  )
}

export default CheckTextModal;