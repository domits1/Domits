import React, {useState} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {confirmSignUp, resendSignUp} from '@aws-amplify/auth';

const ConfirmEmail = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {email, username} = route.params;

  const [confirmationCode, setConfirmationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleConfirm = async () => {
    try {
      const {isSignUpComplete} = await confirmSignUp({
        username,
        confirmationCode,
      });

      if (isSignUpComplete) {
        setSuccessMessage('Email confirmed successfully!');
        navigation.navigate('Login'); // Navigate to login screen after confirmation
      } else {
        setErrorMessage('Email confirmation is not complete.');
      }
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred. Please try again.');
    }
  };

  const handleResendCode = async () => {
    try {
      await resendSignUp(username); // Use username for resending code
      setSuccessMessage('Confirmation code resent successfully!');
    } catch (error) {
      setErrorMessage(
        error.message ||
          'An error occurred while resending the code. Please try again.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Your Email</Text>
      <Text style={styles.label}>
        A confirmation code has been sent to {email}.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Confirmation Code"
        value={confirmationCode}
        onChangeText={setConfirmationCode}
      />
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}
      <Button title="Confirm Email" onPress={handleConfirm} />
      <Button title="Resend Code" onPress={handleResendCode} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
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
    width: '100%',
    maxWidth: 400,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  successText: {
    color: 'green',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default ConfirmEmail;
