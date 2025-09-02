import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/RegisterStyles';
import TranslatedText from '../../../../features/translation/components/TranslatedText';

const PersonalDetailsStep = ({ formData, handleDataChange, onNext }) => {
  const [errors, setErrors] = useState({});

  const validateFullName = (fullName) => {
    if (!fullName.trim()) {
      setErrors(prev => ({ ...prev, fullName: 'Full name is required' }));
      return false;
    }
    if (fullName.trim().length < 2) {
      setErrors(prev => ({ ...prev, fullName: 'Full name must be at least 2 characters' }));
      return false;
    }
    setErrors(prev => ({ ...prev, fullName: '' }));
    return true;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
      return false;
    }
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return false;
    }
    setErrors(prev => ({ ...prev, email: '' }));
    return true;
  };

  const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^\+[0-9\s\-\(\)]{7,}$/;
    if (!phoneNumber.trim()) {
      setErrors(prev => ({ ...prev, phoneNumber: 'Phone number is required' }));
      return false;
    }
    if (!phoneRegex.test(phoneNumber)) {
      setErrors(prev => ({ ...prev, phoneNumber: 'Please enter a valid phone number starting with +' }));
      return false;
    }
    setErrors(prev => ({ ...prev, phoneNumber: '' }));
    return true;
  };



  const validateDateOfBirth = (dateOfBirth) => {
    if (!dateOfBirth.trim()) {
      setErrors(prev => ({ ...prev, dateOfBirth: 'Date of birth is required' }));
      return false;
    }
    
    // Parse DD/MM/YYYY format
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateOfBirth.match(dateRegex);
    
    if (!match) {
      setErrors(prev => ({ ...prev, dateOfBirth: 'Please enter date in DD/MM/YYYY format' }));
      return false;
    }
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Basic date validation
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
      setErrors(prev => ({ ...prev, dateOfBirth: 'Please enter a valid date' }));
      return false;
    }
    
    // Age validation (must be at least 18)
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      setErrors(prev => ({ ...prev, dateOfBirth: 'You must be at least 18 years old' }));
      return false;
    }
    
    setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    return true;
  };

  const handlePhoneNumberChange = (text) => {
    // Ensure it starts with +
    if (!text.startsWith('+')) {
      text = '+' + text;
    }
    
    // Filter to only allow numbers, spaces, hyphens, parentheses after the +
    const filtered = text.replace(/[^0-9+\s\-\(\)]/g, '');
    handleDataChange('phoneNumber', filtered);
  };

  const formatDateInput = (text) => {
    // Remove all non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Format as DD/MM/YYYY
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  const handleDateChange = (text) => {
    const formatted = formatDateInput(text);
    handleDataChange('dateOfBirth', formatted);
  };

  const handleNext = () => {
    const isFullNameValid = validateFullName(formData.fullName);
    const isEmailValid = validateEmail(formData.email);
    const isPhoneValid = validatePhoneNumber(formData.phoneNumber);
    const isDateValid = validateDateOfBirth(formData.dateOfBirth);

    if (isFullNameValid && isEmailValid && isPhoneValid && isDateValid) {
      onNext();
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>
        <TranslatedText textToTranslate="Personal Details" />
      </Text>
      <Text style={styles.helperText}>
        <TranslatedText textToTranslate="Tell us about yourself" />
      </Text>

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Full Name" />:
      </Text>
      <TextInput
        style={[styles.input, errors.fullName ? styles.inputFocused : null]}
        placeholder="Enter your full name"
        value={formData.fullName}
        onChangeText={(value) => {
          handleDataChange('fullName', value);
          validateFullName(value);
        }}
      />
      {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Email" />:
      </Text>
      <TextInput
        style={[styles.input, errors.email ? styles.inputFocused : null]}
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(value) => {
          handleDataChange('email', value);
          validateEmail(value);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Phone Number" />:
      </Text>
      <TextInput
        style={[styles.input, errors.phoneNumber ? styles.inputFocused : null]}
        placeholder="+31 06 12345678"
        value={formData.phoneNumber}
        onChangeText={handlePhoneNumberChange}
        keyboardType="phone-pad"
      />
      {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Date of Birth" />:
      </Text>
      <TextInput
        style={[styles.input, errors.dateOfBirth ? styles.inputFocused : null]}
        placeholder="DD/MM/YYYY"
        value={formData.dateOfBirth}
        onChangeText={handleDateChange}
        keyboardType="numeric"
        maxLength={10}
      />
      {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.buttonText}>
          <TranslatedText textToTranslate="Next" />
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default PersonalDetailsStep;