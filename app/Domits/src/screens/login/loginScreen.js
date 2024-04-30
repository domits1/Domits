import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import {useNavigation} from "@react-navigation/native";

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // login logic
  };

  const handleGoogleSignIn = () => {
    // Google sign-in logic
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Log in or sign up</Text>
      </View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <TouchableOpacity onPress={() => {}}>
        <Text style={styles.linkText}>Forgot your password?</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {navigation.navigate('SignupScreen')}}>
        <Text style={styles.linkText}>Don't have an account? Sign up!</Text>
      </TouchableOpacity>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.divider} />
      </View>
      {/* <TouchableOpacity onPress={handleGoogleSignIn} style={styles.googleSignInButton}>
        <Image source={require('./path-to-your-google-icon.png')} style={styles.googleIcon} />
        <Text style={styles.googleSignInText}>Sign in with Google</Text>
      </TouchableOpacity> */}
      <View style={styles.buttonAlignment}>
        <TouchableOpacity onPress={handleLogin} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'stretch',
    justifyContent: 'center',
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
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'black',
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 16,
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
    width: 100,
    borderRadius: 20,
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
});

export default LoginScreen;
