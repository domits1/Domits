import React, {useState} from 'react';
import {SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {signIn} from '@aws-amplify/auth'; // Correct import for Amplify Auth
import {useAuth} from '../../context/AuthContext'; // Ensure the path is correct
import 'react-native-get-random-values';
import {Label} from '@aws-amplify/ui-react-native/src/primitives';
import LoadingScreen from "../loadingscreen/screens/LoadingScreen";
import {ACCOUNT_HOME_SCREEN, HOME_SCREEN, REGISTER_SCREEN} from "../../navigation/utils/NavigationNameConstants";

const LoginScreen = () => {
  const navigation = useNavigation();
  const {checkAuth, isAuthenticated} = useAuth(); // Get the checkAuth method from context
  const [formData, setFormData] = useState({email: '', password: ''});
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      if (isAuthenticated) {
        navigation.navigate(ACCOUNT_HOME_SCREEN);
      } else {
        setLoading(false);
      }
    }, [isAuthenticated, navigation]),
  );

  const handleChange = (name, value) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleLogin = async () => {
    const {email, password} = formData;
    try {
      await signIn({username: email, password}); // Ensure the correct parameters
      checkAuth(); // Update the global auth state
      navigation.navigate(HOME_SCREEN)
    } catch (error) {
      setErrorMessage('Invalid username or password. Please try again.');
    }
  };

  const handleGoogleSignIn = () => {
    // Google sign-in logic
  };

  if (loading) {
    return (
      <LoadingScreen/>
    );
  } else {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <View style={styles.header}>
            <Text style={styles.headerText}>Log in or sign up</Text>
          </View>
          <Label style={styles.labelText}>Email</Label>
          <TextInput
            placeholder="Email"
            placeholderTextColor="gray"
            value={formData.email}
            onChangeText={value => handleChange('email', value)}
            style={styles.input}
            keyboardType="email-address"
          />
          <Label style={styles.labelText}>Password</Label>
          <TextInput
            placeholder="Password"
            placeholderTextColor="gray"
            value={formData.password}
            onChangeText={value => handleChange('password', value)}
            style={styles.input}
            secureTextEntry
          />
          {errorMessage ? (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              alert('To be done');
            }}>
            <Text style={styles.linkText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* Divider with "or" */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.buttonAlignment}>
            {/* Google Sign-in button */}
            <TouchableOpacity onPress={handleGoogleSignIn} style={styles.googleSignInButton}>
              <Text style={styles.googleSignInText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonAlignment}>
            {/* Register button */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                navigation.navigate(REGISTER_SCREEN);
              }}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonAlignment}>
            {/* Log in button */}
            <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'stretch',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerText: {
    paddingTop: 40,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  labelText: {
    fontWeight: 'bold',
    marginLeft: 1,
  },
  input: {
    height: 50,
    borderColor: 'green',
    color: 'black',
    borderWidth: 1,
    marginBottom: 12,
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  linkText: {
    color: '#0D9813',
    marginBottom: 20,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  buttonAlignment: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'gray',
    marginHorizontal: 10,
  },
  orText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'gray',
    textTransform: 'uppercase',
  },
  loginButton: {
    backgroundColor: '#0D9813',
    width: 140,
    height: 47,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: '#003366',
    width: 140,
    height: 47,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorMessage: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  googleSignInButton: {
    backgroundColor: '#ffffff',
    width: 200,
    height: 47,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleSignInText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LoginScreen;
