import React, {useEffect, useState} from 'react';
import {SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../context/AuthContext';
import {getCurrentUser, signUp} from '@aws-amplify/auth';
import CheckBox from '@react-native-community/checkbox';
import {CONFIRM_EMAIL_SCREEN} from "../../../navigation/utils/NavigationNameConstants";
import {styles} from "../styles/RegisterStyles";
import Ionicons from "react-native-vector-icons/Ionicons";

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

  const handleChangePassword = (name, value) => {
    setFormData(prevState => ({...prevState, [name]: value}));
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = password => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
    };
    const metRequirements = Object.values(requirements).filter(Boolean).length;

    let strength = {text: 'Weak', color: 'red'};
    if (metRequirements === 4) {
      strength = {text: 'Very Strong', color: 'green'};
    } else if (metRequirements === 3) {
      strength = {text: 'Strong', color: '#088f08'};
    } else if (metRequirements === 2) {
      strength = {text: 'Weak', color: 'orange'};
    }

    setPasswordStrength({...strength, requirements});
  };
  const handleHostChange = () => {
    setIsHost(!isHost);
  };

  const handleChange = (name, value) => {
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

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
    // Basic validation
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

  const handleGoBackPress = () => {
    navigation.goBack();
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <TouchableOpacity onPress={handleGoBackPress}>
          <Ionicons
              name="chevron-back-outline"
              size={24}
          />
        </TouchableOpacity>
        <View style={styles.container}>
          <View style={styles.registerContainer}>
            <Text style={styles.title}>Create an Account on Domits</Text>
            <Text style={styles.label}>First Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={value => handleChange('firstName', value)}
            />
            <Text style={styles.label}>Last Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={value => handleChange('lastName', value)}
            />
            <Text style={styles.label}>Email:</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={value => handleChange('email', value)}
            />
            <Text style={styles.label}>Password:</Text>
            <TextInput
              style={[styles.input, {borderColor: passwordStrength.color}]}
              placeholder="Password"
              secureTextEntry
              value={formData.password}
              onChangeText={value => handleChangePassword('password', value)}
            />
            <View style={styles.passwordRequirements}>
              <Text>
                Password Strength:{' '}
                <Text style={{color: passwordStrength.color}}>
                  {passwordStrength.text}
                </Text>
              </Text>
              <Text>Requirements:</Text>
              <Text>
                {passwordStrength.requirements.length ? '✔' : '✘'} At least 8
                characters
              </Text>
              <Text>
                {passwordStrength.requirements.uppercase ? '✔' : '✘'} One
                uppercase letter
              </Text>
              <Text>
                {passwordStrength.requirements.number ? '✔' : '✘'} One number
              </Text>
              <Text>
                {passwordStrength.requirements.specialChar ? '✔' : '✘'} One
                special character
              </Text>
            </View>
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
