import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Auth } from 'aws-amplify';

const EmailSettings = () => {
  const { user, userAttributes } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(userAttributes?.['given_name'] || 'N/A');
      setEmail(userAttributes?.email || 'N/A');
    } else {
      setFirstName('');
      setEmail('');
    }
    loadUser();
  }, [user, userAttributes]);

  const loadUser = async () => {
    try {
      const userInfo = await Auth.currentAuthenticatedUser();
      setEmail(userInfo.attributes.email);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const saveEmail = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, { email });
      setIsEditingEmail(false);
      setIsVerifyingEmail(true); // Start the verification process
    } catch (error) {
      console.error('Error updating email:', error);
    }
  };

  const verifyEmail = async () => {
    try {
      await Auth.verifyCurrentUserAttributeSubmit('email', verificationCode);
      Alert.alert("Email verification successful!");
      setIsVerifyingEmail(false);
    } catch (error) {
      console.error('Error confirming email change:', error);
      Alert.alert("Failed to verify email. Please try again.");
    }
  };

  const saveName = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, { 'given_name': firstName });
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const savePassword = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(user, { password });
      setIsEditingPassword(false);
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Settings</Text>
        </View>
        <View style={styles.personalInfo}>
          <Text style={{ fontWeight: 'bold', fontSize: 20 }}>Personal Information</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isEditingEmail ? (
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            ) : ( 
              <Text>Email: {email}</Text>
            )}
            <TouchableOpacity
              onPress={() => (isEditingEmail ? saveEmail() : setIsEditingEmail(true))}
              style={styles.button}
            >
              <Text style={{ marginBottom: 20 }}>{isEditingEmail ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          {isVerifyingEmail && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <TextInput
                placeholder="Enter verification code"
                value={verificationCode}
                onChangeText={setVerificationCode}
                style={styles.input}
              />
              <TouchableOpacity
                onPress={verifyEmail}
                style={styles.button}
              >
                <Text>Verify</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
            {isEditingName ? (
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
              />
            ) : (
              <Text>Name: {firstName}</Text>
            )}
            <TouchableOpacity
              onPress={() => (isEditingName ? saveName() : setIsEditingName(true))}
              style={styles.button}
            >
              <Text style={{ marginBottom: 20 }}>{isEditingName ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* <View style={styles.personalInfo}>
          <Text style={{fontWeight: 'bold', fontSize: 20,}}>Change Password</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isEditingEmail ? (
              <TextInput
                // value={email}
                // onChangeText={setEmail}
                style={styles.input}
              />
            ) : (
              <Text>Current password: {}</Text>
            )}
            <TouchableOpacity
              onPress={() => (isEditingEmail ? savePassword() : setIsEditingPassword(true))}
              style={styles.button}
            >
              <Text style={{ marginBottom: 20, }} 
              >{isEditingEmail ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, }}>
            {isEditingName ? (
              <TextInput
                // value={firstName}
                // onChangeText={setFirstName}
                style={styles.input}
              />
            ) : (
              <Text>Password: {}</Text>
            )}
            <TouchableOpacity
              onPress={() => (isEditingName ? savePassword() : setIsEditingPassword(true))}
              style={styles.button}
            >
              <Text style={{ marginBottom: 20, }} 
              >{isEditingName ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, }}>
            {isEditingName ? (
              <TextInput
                // value={firstName}
                // onChangeText={setFirstName}
                style={styles.input}
              />
            ) : (
              <Text>Password confirmation: {}</Text>
            )}
            <TouchableOpacity
              onPress={() => (isEditingName ? savePassword() : setIsEditingName(true))}
              style={styles.button}
            >
              <Text style={{ marginBottom: 20, }} 
              >{isEditingName ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 30,
    marginTop: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
  },
  personalInfo: {
    fontWeight: 'bold',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 10,
    margin: 20,
    marginBottom: 0,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: '80%',
    padding: 10,
  },
  button: {
    padding: 10,
    marginTop: 20,
  },
});

export default EmailSettings;





