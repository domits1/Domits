import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { signUp, getCurrentUser, signOut } from '@aws-amplify/auth';
import CheckBox from '@react-native-community/checkbox';

const Register = () => {
  const navigation = useNavigation();
  const { setAuthCredentials } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    firstName: '',
    lastName: '',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isHost, setIsHost] = useState(false);

  const handleHostChange = () => {
    setIsHost(!isHost);
  };

  const handleChange = (name, value) => {
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const onSubmit = async () => {
    const { username, email, password, firstName, lastName } = formData;

    if (username.length < 4) {
      setErrorMessage('Username must be at least 4 characters long.');
      return;
    }
    if (firstName.length < 2 || lastName.length < 2) {
      setErrorMessage('First and last name must be at least 2 characters long.');
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
      const groupName = isHost ? 'Host' : 'Traveler';
      await signUp({
        username: email,
        password,
        attributes: {
          'custom:group': groupName,
          'custom:username': username,
          email: email,
          given_name: firstName,
          family_name: lastName,
        },
      });

      if (setAuthCredentials) {
        setAuthCredentials(email, password);
      }

      navigation.navigate('ConfirmEmail', {
        email: email,
        username: email, // Using email as the username for confirmation
      });
    } catch (error) {
      if (error.code === 'UsernameExistsException') {
        setErrorMessage('User already exists!');
      } else {
        console.error('Error:', error);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.container}>
      {isAuthenticated ? (
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={async () => {
            await signOut();
            setIsAuthenticated(false);
          }}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
      ) : (
        <View style={styles.registerContainer}>
          <Text style={styles.title}>Create an Account on Domits</Text>
          <Text style={styles.label}>Username:</Text>
          <TextInput
            style={styles.input} // for now because it doesnt want to work with confirmmail
            placeholder="Username"
            value={formData.username}
            onChangeText={(value) => handleChange('username', value)}
          />
          <Text style={styles.label}>First Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(value) => handleChange('firstName', value)}
          />
          <Text style={styles.label}>Last Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(value) => handleChange('lastName', value)}
          />
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
          />
          <Text style={styles.label}>Password:</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
          />
          <View style={styles.checkboxContainer}>
            <CheckBox
            value={isHost}
            onValueChange={handleHostChange}
            tintColors={{ true: 'black', false: 'black' }}
          />
            <Text
                style={[
                  styles.checkBoxLabel,
                  { color: isHost ? 'black' : 'black' }
                ]}>
              Become a Host
            </Text>
          </View>
          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          <TouchableOpacity style={styles.signUpButton} onPress={onSubmit}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <Text style={styles.linkText} onPress={() => navigation.navigate('Login')}>
            Already have an account? Log in here
          </Text>
        </View>
      )}
    </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  registerContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: 'black',
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderColor: '#003366',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
    color: 'black',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkBoxLabel: {
    fontSize: 16,
    color: 'black',
    marginLeft: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  signUpButton: {
    backgroundColor: '#003366',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#003366',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },

  signOutButton: {
    backgroundColor: '#003366',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
});

export default Register;
