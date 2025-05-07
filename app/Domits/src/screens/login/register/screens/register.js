import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../../context/AuthContext';
import {getCurrentUser} from '@aws-amplify/auth';
import CheckBox from '@react-native-community/checkbox';
import {CONFIRM_EMAIL_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";
import {styles} from "../styles/RegisterStyles";
import PersonalDetailsView from "../views/PersonalDetailsView";
import EmailView from "../views/EmailView";
import PasswordView from "../views/PasswordView";

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
  const [passwordStrength, setPasswordStrength] = useState({
    text: 'Weak',
    color: 'red',
    requirements: {
      length: false,
      uppercase: false,
      number: false,
      specialChar: false,
    },
  });
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
    if (!passwordStrength.requirements.length) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (
      !passwordStrength.requirements.uppercase ||
      !passwordStrength.requirements.number
    ) {
      setErrorMessage(
        'Password must contain an uppercase letter and a number.',
      );
      return;
    }
    if (!passwordStrength.requirements.specialChar) {
      setErrorMessage('Password must contain at least one special character.');
      return;
    }
    if (username.length < 4) {
      setErrorMessage('Username must be at least 4 characters long.');
      return;
    }
    if (firstName.length < 2 || lastName.length < 2) {
      setErrorMessage(
        'First and last name must be at least 2 characters long.',
      );
      return;
    }
    if (password.length < 7) {
      setErrorMessage('Password must be at least 7 characters long.');
      return;
    }
    if (!email) {
      setErrorMessage("Email can't be empty!");
      return;
    }

    try {
      const emailName = email.split('@')[0];
      const groupName = isHost ? 'Host' : 'Traveler';

      // const {isSignUpComplete, userId, nextStep} = await signUp({
      //   username: email, // Email as username
      //   password,
      //   options: {
      //     userAttributes: {
      //       'custom:group': groupName,
      //       'custom:username': username + emailName,
      //       email,
      //       given_name: firstName,
      //       family_name: lastName,
      //     },
      //     autoSignIn: true,
      //   },
      // });

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
          <View style={styles.registerContainer}>
            <Text style={styles.title}>Create an Account on Domits</Text>

            <PersonalDetailsView formData={formData} handleDataChange={handleDataChange} handleValidFormChange={handleValidFormChange}/>
            <EmailView formData={formData} handleDataChange={handleDataChange} handleValidFormChange={handleValidFormChange}/>
            <PasswordView formData={formData} setFormData={setFormData}/>

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <View style={styles.asHostCheckBox}>
              <CheckBox value={isHost} onValueChange={handleHostChange} />
              <Text>Sign up as a host</Text>
            </View>
            <TouchableOpacity style={styles.signUpButton} onPress={onSubmit}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Register;
