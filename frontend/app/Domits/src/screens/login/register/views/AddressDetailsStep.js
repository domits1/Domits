import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/RegisterStyles';
import TranslatedText from '../../../../features/translation/components/TranslatedText';

const AddressDetailsStep = ({ formData, handleDataChange, onNext, onBack }) => {
  const [errors, setErrors] = useState({});

  const validateAddress = (address) => {
    if (!address.trim()) {
      setErrors(prev => ({ ...prev, address: 'Address is required' }));
      return false;
    }
    if (address.trim().length < 5) {
      setErrors(prev => ({ ...prev, address: 'Please enter a complete address' }));
      return false;
    }
    setErrors(prev => ({ ...prev, address: '' }));
    return true;
  };

  const validatePostcode = (postcode) => {
    if (!postcode.trim()) {
      setErrors(prev => ({ ...prev, postcode: 'Postcode is required' }));
      return false;
    }
    if (postcode.trim().length < 4) {
      setErrors(prev => ({ ...prev, postcode: 'Please enter a valid postcode' }));
      return false;
    }
    setErrors(prev => ({ ...prev, postcode: '' }));
    return true;
  };

  const validateCountry = (country) => {
    if (!country.trim()) {
      setErrors(prev => ({ ...prev, country: 'Country is required' }));
      return false;
    }
    if (country.trim().length < 2) {
      setErrors(prev => ({ ...prev, country: 'Please enter a valid country' }));
      return false;
    }
    setErrors(prev => ({ ...prev, country: '' }));
    return true;
  };

  const handleNext = () => {
    const isAddressValid = validateAddress(formData.address);
    const isPostcodeValid = validatePostcode(formData.postcode);
    const isCountryValid = validateCountry(formData.country);

    if (isAddressValid && isPostcodeValid && isCountryValid) {
      onNext();
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>
        <TranslatedText textToTranslate="Address Details" />
      </Text>
      <Text style={styles.helperText}>
        <TranslatedText textToTranslate="Where are you located?" />
      </Text>

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Street Address" />:
      </Text>
      <TextInput
        style={[styles.inputMultiline, errors.address ? styles.inputFocused : null]}
        placeholder="Enter your street address"
        value={formData.address}
        onChangeText={(value) => {
          handleDataChange('address', value);
          validateAddress(value);
        }}
        multiline
        numberOfLines={3}
        placeholderTextColor="#a0aec0"
      />
      {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Postcode" />:
      </Text>
      <TextInput
        style={[styles.input, errors.postcode ? styles.inputFocused : null]}
        placeholder="Enter your postcode"
        value={formData.postcode}
        onChangeText={(value) => {
          handleDataChange('postcode', value);
          validatePostcode(value);
        }}
      />
      {errors.postcode ? <Text style={styles.errorText}>{errors.postcode}</Text> : null}

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Country" />:
      </Text>
      <TextInput
        style={[styles.input, errors.country ? styles.inputFocused : null]}
        placeholder="Enter your country"
        value={formData.country}
        onChangeText={(value) => {
          handleDataChange('country', value);
          validateCountry(value);
        }}
      />
      {errors.country ? <Text style={styles.errorText}>{errors.country}</Text> : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>
            <TranslatedText textToTranslate="Back" />
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.buttonText}>
            <TranslatedText textToTranslate="Next" />
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddressDetailsStep;