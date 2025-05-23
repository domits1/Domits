import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../../context/AuthContext';
import {getCurrentUser, signUp} from '@aws-amplify/auth';
import CheckBox from '@react-native-community/checkbox';
import {CONFIRM_EMAIL_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";
import {styles} from "../styles/RegisterStyles";
import PersonalDetailsView from "../views/PersonalDetailsView";
import EmailView from "../views/EmailView";
import PasswordView from "../views/PasswordView";
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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: generateRandomUsername(),
    firstName: '',
    lastName: '',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [validFormData, setValidFormData] = useState({
    email: false,
    password: false,
    firstname: false,
    lastname: false,
  })

  const handleHostChange = () => {
    setIsHost(!isHost);
  };

  const handleDataChange = (name, value) => {
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleValidFormChange = (name, boolean) => {
    setValidFormData(prevState => ({
      ...prevState,
      [name]: boolean,
    }))
  }

  const onSubmit = async () => {
    const {username, email, password, firstName, lastName} = formData;

    if (!validFormData.firstname) {
      setErrorMessage("First name is not valid.");
      return;
    } else if (!validFormData.lastname) {
      setErrorMessage("Last name is not valid.");
      return;
    } else if (!validFormData.email) {
      setErrorMessage("Email is not valid.");
      return;
    } else if (!validFormData.password) {
      setErrorMessage("Password must be stronger.");
      return;
    } else {
      setErrorMessage("");
    }

    try {
      const emailName = email.split('@')[0];
      const groupName = isHost ? 'Host' : 'Traveler';

      const {isSignUpComplete, userId, nextStep} = await signUp({
        username: email, // Email as username
        password,
        options: {
          userAttributes: {
            'custom:group': groupName,
            'custom:username': username + emailName,
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

  return (
      <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <ChangeLanguageView/>
            <View style={styles.registerContainer}>
              <Text style={styles.title}><TranslatedText textToTranslate={"Create an Account on Domits"}/></Text>

              <PersonalDetailsView formData={formData} handleDataChange={handleDataChange} handleValidFormChange={handleValidFormChange}/>
              <EmailView formData={formData} handleDataChange={handleDataChange} handleValidFormChange={handleValidFormChange}/>
              <PasswordView formData={formData} setFormData={setFormData} handleValidFormChange={handleValidFormChange}/>

              {errorMessage && (
                  <Text style={styles.errorText}><TranslatedText textToTranslate={errorMessage}/></Text>
              )}

              <View style={styles.asHostCheckBox}>
                <CheckBox value={isHost} onValueChange={handleHostChange} />
                <TranslatedText textToTranslate={"Sign up as a host"}/>
              </View>
              <TouchableOpacity style={styles.signUpButton} onPress={onSubmit}>
                <Text style={styles.buttonText}><TranslatedText textToTranslate={"Sign up"}/></Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
};

export default Register;
