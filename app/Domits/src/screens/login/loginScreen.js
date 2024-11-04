import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {signIn} from '@aws-amplify/auth'; // Correct import for Amplify Auth
import {useAuth} from '../../context/AuthContext'; // Ensure the path is correct
import 'react-native-get-random-values';
import {Label} from '@aws-amplify/ui-react-native/src/primitives';

const LoginScreen = () => {
  const navigation = useNavigation();
  const {checkAuth} = useAuth(); // Get the checkAuth method from context
  const [formData, setFormData] = useState({email: '', password: ''});
  const [errorMessage, setErrorMessage] = useState('');

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
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error logging in:', error);
      setErrorMessage('Invalid username or password. Please try again.');
    }
  };

  const handleGoogleSignIn = () => {
    // Google sign-in logic
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Log in or sign up</Text>
      </View>
      <Label>Email</Label>
      <TextInput
        placeholder="Email"
        value={formData.email}
        onChangeText={value => handleChange('email', value)}
        style={styles.input}
        keyboardType="email-address"
      />
      <Label>Password</Label>
      <TextInput
        placeholder="Password"
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
      {/*<TouchableOpacity*/}
      {/*  onPress={() => {*/}
      {/*    navigation.navigate('SignupScreen');*/}
      {/*  }}>*/}
      {/*  <Text style={styles.linkText}>Don't have an account? Sign up!</Text>*/}
      {/*</TouchableOpacity>*/}
      <View style={styles.buttonAlignment}>
        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Log in</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.divider} />
      </View>
      <View style={styles.buttonAlignment}>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => {
            navigation.navigate('Register');
          }}>
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
      {/* <TouchableOpacity onPress={handleGoogleSignIn} style={styles.googleSignInButton}>
        <Image source={require('./path-to-your-google-icon.png')} style={styles.googleIcon} />
        <Text style={styles.googleSignInText}>Sign in with Google</Text>
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'stretch',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    borderRadius: 4,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  linkText: {
    color: 'blue',
    marginBottom: 20,
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 350,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'black',
    marginHorizontal: 9,
  },
  orText: {
    marginHorizontal: 20,
    fontSize: 23,
  },
  googleSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    marginBottom: 20,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleSignInText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#0D9813',
    width: 105,
    height: 47,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonAlignment: {
    flex: 1,
    alignItems: 'center',
  },
  registerButton: {
    backgroundColor: '#003366',
    width: 105,
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -340,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorMessage: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default LoginScreen;
