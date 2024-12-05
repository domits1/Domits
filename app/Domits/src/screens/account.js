import React, {useEffect, useState} from 'react';
import {View, Text, Button, SafeAreaView, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext';
import {signOut} from '@aws-amplify/auth';

const Account = () => {
  const navigation = useNavigation();
  const {isAuthenticated, user, userAttributes, checkAuth} = useAuth();
  const [firstName, setFirstName] = useState(''); // Add firstName state
  const [customUsername, setCustomUsername] = useState('');
  const [email, setEmail] = useState('');
  const [hostGuest, setHostGuest] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(userAttributes?.['given_name'] || 'N/A'); // Set firstName from given_name attribute
      setCustomUsername(userAttributes?.['custom:username'] || 'N/A');
      setEmail(userAttributes?.email || 'N/A');
      setHostGuest(userAttributes?.['custom:group'] || 'N/A');
    } else {
      // Reset the state when the user is logged out
      setFirstName('');
      setCustomUsername('');
      setEmail('');
      setHostGuest('');
    }
  }, [user, userAttributes]);

  const handleLogout = async () => {
    try {
      await signOut(); // Logs out the user
      checkAuth(); // Update authentication state in context
      navigation.navigate('LoginScreen'); // Navigate to login screen after logout
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <SafeAreaView style={styles.items}>
    <Text style={styles.listItemAccount}>Account</Text>
    <Text style={styles.listItemText}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
    <Text style={styles.listItemText}>First Name: {firstName}</Text>
    <Text style={styles.listItemText}>Username: {customUsername}</Text>
    <Text style={styles.listItemText}>Email: {email}</Text>
    <Text style={styles.listItemText}>Type: {hostGuest}</Text>
    <View style={styles.buttonContainer}>
      {isAuthenticated && hostGuest === 'Host' && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('HostHomepage')}
        >
          <Text style={styles.buttonText}>Go to Host Dashboard</Text>
        </TouchableOpacity>
      )}
      {isAuthenticated && (
        <TouchableOpacity
          style={styles.buttonGuestDashboard}
          onPress={() => navigation.navigate('GuestDashboard')}
        >
          <Text style={styles.buttonText}>Go to Guest Dashboard</Text>
        </TouchableOpacity>
      )}
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.buttonLogin}
          onPress={() => navigation.navigate('LoginScreen')}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      )}
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      )}
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Landing')}
        >
          <Text style={styles.buttonText}>Landing</Text>
        </TouchableOpacity>
      )}
      {isAuthenticated && (
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  listItemText: {
    color: 'black',
    fontSize: 16,
    marginLeft: 40,
    marginVertical: 5,
    textAlign: 'left',
  },
  listItemAccount:{
    color: 'black',
    fontSize: 19,
    marginLeft: 10,
    marginVertical: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  items: {
    flex: 1,
    padding: 30,
    marginTop: 80,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#003366',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
  },

  buttonGuestDashboard:{
    backgroundColor: 'green',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
  },

  buttonLogin: {
    backgroundColor: 'green',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Account;
