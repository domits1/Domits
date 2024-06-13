import React, {useState, useEffect} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {signUp, getCurrentUser, signOut} from '@aws-amplify/auth';
import CheckBox from '@react-native-community/checkbox';

const Register = () => {
  const navigation = useNavigation();
  const {setAuthCredentials} = useAuth(); // Remove if not defined in AuthContext
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    repeatPassword: '',
    username: '',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isHost, setIsHost] = useState(false);

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
    const {username, email, password, repeatPassword} = formData;

    if (username.length < 4) {
      setErrorMessage('Username must be at least 4 characters long.');
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
    if (!password || !repeatPassword) {
      setErrorMessage("Password can't be empty!");
      return;
    }
    if (password !== repeatPassword) {
      setErrorMessage('Passwords do not match!');
      return;
    }

    // Attempt to sign up the user
    try {
      const groupName = isHost ? 'Host' : 'Traveler';
      const data = await signUp({
        username: email,
        password,
        attributes: {
          'custom:group': groupName,
          'custom:username': username,
          email: email,
        },
      });

      // Only setAuthCredentials if it's defined in the context
      if (setAuthCredentials) {
        setAuthCredentials(email, password);
      }
console.log(data.userId)
      navigation.navigate('ConfirmEmail', {
        email: email,
        username: data.userId,
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
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      {isAuthenticated ? (
        <Button
          onPress={async () => {
            await signOut();
            setIsAuthenticated(false);
          }}
          title="Sign out"
        />
      ) : (
        <View style={styles.registerContainer}>
          <Text style={styles.title}>Create an account on Domits</Text>
          <Text style={styles.label}>Username:</Text>
          <TextInput
            style={[
              styles.input,
              errorMessage.includes('Username') && styles.inputError,
            ]}
            placeholder="Username"
            value={formData.username}
            onChangeText={value => handleChange('username', value)}
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
            style={[
              styles.input,
              errorMessage.includes('Password') && styles.inputError,
            ]}
            placeholder="Password"
            secureTextEntry
            value={formData.password}
            onChangeText={value => handleChange('password', value)}
          />
          <Text style={styles.label}>Repeat Password:</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat Password"
            secureTextEntry
            value={formData.repeatPassword}
            onChangeText={value => handleChange('repeatPassword', value)}
          />
          <View style={styles.checkboxContainer}>
            <Text>Become a Host</Text>
            <CheckBox value={isHost} onValueChange={handleHostChange} />
          </View>
          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          <Button title="Sign Up" onPress={onSubmit} />
          <Text
            style={styles.linkText}
            onPress={() => navigation.navigate('Login')}>
            Already have an account? Log in here
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  registerContainer: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  inputError: {
    borderColor: 'red',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
  },
  linkText: {
    color: 'blue',
    marginTop: 20,
    textAlign: 'center',
  },
});

export default Register;
