import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { styles } from '../styles/RegisterStyles';
import TranslatedText from '../../../../features/translation/components/TranslatedText';

const PasswordCreationStep = ({ formData, handleDataChange, onBack, onSubmit }) => {
  const [errors, setErrors] = useState({});
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });

  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordRequirements(requirements);

    if (!requirements.length) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters long' }));
      return false;
    }
    if (!requirements.uppercase) {
      setErrors(prev => ({ ...prev, password: 'Password must contain at least 1 uppercase letter' }));
      return false;
    }
    if (!requirements.number) {
      setErrors(prev => ({ ...prev, password: 'Password must contain at least 1 number' }));
      return false;
    }
    if (!requirements.special) {
      setErrors(prev => ({ ...prev, password: 'Password must contain at least 1 special character' }));
      return false;
    }

    setErrors(prev => ({ ...prev, password: '' }));
    return true;
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword.trim()) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your password' }));
      return false;
    }
    if (confirmPassword !== formData.password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return false;
    }
    setErrors(prev => ({ ...prev, confirmPassword: '' }));
    return true;
  };

  const handlePasswordChange = (password) => {
    handleDataChange('password', password);
    validatePassword(password);
  };

  const handleConfirmPasswordChange = (confirmPassword) => {
    handleDataChange('confirmPassword', confirmPassword);
    validateConfirmPassword(confirmPassword);
  };

  const handleSubmit = () => {
    const isPasswordValid = validatePassword(formData.password);
    const isConfirmPasswordValid = validateConfirmPassword(formData.confirmPassword);

    if (isPasswordValid && isConfirmPasswordValid) {
      onSubmit();
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>
        <TranslatedText textToTranslate="Create Password" />
      </Text>
      <Text style={styles.helperText}>
        <TranslatedText textToTranslate="Choose a secure password" />
      </Text>

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Password" />:
      </Text>
      <TextInput
        style={[styles.input, errors.password ? styles.inputFocused : null]}
        placeholder="Enter your password"
        value={formData.password}
        onChangeText={handlePasswordChange}
        secureTextEntry
      />
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      <View style={styles.passwordRequirements}>
        <Text style={styles.requirementText}>
          {passwordRequirements.length ? '✓' : '✗'} At least 8 characters
        </Text>
        <Text style={styles.requirementText}>
          {passwordRequirements.uppercase ? '✓' : '✗'} At least 1 uppercase letter
        </Text>
        <Text style={styles.requirementText}>
          {passwordRequirements.number ? '✓' : '✗'} At least 1 number
        </Text>
        <Text style={styles.requirementText}>
          {passwordRequirements.special ? '✓' : '✗'} At least 1 special character
        </Text>
      </View>

      <Text style={styles.label}>
        <TranslatedText textToTranslate="Confirm Password" />:
      </Text>
      <TextInput
        style={[styles.input, errors.confirmPassword ? styles.inputFocused : null]}
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChangeText={handleConfirmPasswordChange}
        secureTextEntry
      />
      {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>
            <TranslatedText textToTranslate="Back" />
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.signUpButton} onPress={handleSubmit}>
          <Text style={styles.buttonText}>
            <TranslatedText textToTranslate="Sign Up" />
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PasswordCreationStep;