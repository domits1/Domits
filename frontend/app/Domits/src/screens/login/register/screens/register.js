import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../../context/AuthContext';
import {getCurrentUser, signUp} from '@aws-amplify/auth';
import CheckBox from '@react-native-community/checkbox';
import {CONFIRM_EMAIL_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";
import {styles} from "../styles/RegisterStyles";
import PersonalDetailsStep from "../views/PersonalDetailsStep";
import AddressDetailsStep from "../views/AddressDetailsStep";
import PasswordCreationStep from "../views/PasswordCreationStep";
import TranslatedText from "../../../../features/translation/components/TranslatedText";
import ChangeLanguageView from "../views/ChangeLanguageView";

const generateRandomUsername = () => {
  const chars = String.fromCharCode(...Array(127).keys()).slice(33);
  let result = '';
  for (let i = 0; i < 15; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const Register = () => {
  const navigation = useNavigation();
  const {setAuthCredentials} = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Personal Details
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    // Step 2: Address Details
    address: '',
    postcode: '',
    country: '',
    // Step 3: Password
    password: '',
    confirmPassword: '',
    // Additional fields
    username: generateRandomUsername(),
    isHost: false,
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleHostChange = () => {
    setFormData(prevState => ({
      ...prevState,
      isHost: !prevState.isHost,
    }));
  };

  const handleDataChange = (name, value) => {
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const onSubmit = async () => {
    const {username, email, password, fullName, phoneNumber, dateOfBirth, address, postcode, country, isHost} = formData;

    setErrorMessage("");

    try {
      const emailName = email.split('@')[0];
      const groupName = isHost ? 'Host' : 'Traveler';
      
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const {isSignUpComplete, userId, nextStep} = await signUp({
        username: email, // Email as username
        password,
        options: {
          userAttributes: {
            'custom:group': groupName,
            'custom:username': username + emailName,
            'custom:phone_number': phoneNumber,
            'custom:date_of_birth': dateOfBirth,
            'custom:address': address,
            'custom:postcode': postcode,
            'custom:country': country,
            email,
            given_name: firstName,
            family_name: lastName,
          },
          autoSignIn: true,
        },
      });

      if (setAuthCredentials) {
        setAuthCredentials(email, password);
      }

      // Navigate to confirmation screen
      navigation.navigate(CONFIRM_EMAIL_SCREEN, {
        email: email,
        username: email,
      });
    } catch (error) {
      if (error.code === 'UsernameExistsException') {
        setErrorMessage('User already exists!');
      } else {
        console.error('Error signing up:', error);
        setErrorMessage('An error occurred. Please try again.');
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalDetailsStep
            formData={formData}
            handleDataChange={handleDataChange}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <AddressDetailsStep
            formData={formData}
            handleDataChange={handleDataChange}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <PasswordCreationStep
            formData={formData}
            handleDataChange={handleDataChange}
            onBack={handleBack}
            onSubmit={onSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
      <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
        <View style={styles.container}>
          {/* iOS Back Button */}
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.iosBackButton}
          >
            <Text style={styles.iosBackButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.registerContainer}>
              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                {[1, 2, 3].map((step) => (
                  <View
                    key={step}
                    style={[
                      styles.progressStep,
                      currentStep >= step ? styles.progressStepActive : styles.progressStepInactive
                    ]}
                  >
                    <Text style={[
                      styles.progressStepText,
                      currentStep >= step ? styles.progressStepTextActive : styles.progressStepTextInactive
                    ]}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>

              {renderStep()}

              {errorMessage && (
                  <Text style={styles.errorText}><TranslatedText textToTranslate={errorMessage}/></Text>
              )}

              {/* Host checkbox - only show on step 3 */}
              {currentStep === 3 && (
                <View style={styles.asHostCheckBox}>
                  <CheckBox value={formData.isHost} onValueChange={handleHostChange} />
                  <TranslatedText textToTranslate={"Sign up as a host"}/>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
  );
};

export default Register;
