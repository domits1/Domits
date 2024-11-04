import React, {useEffect, useState} from 'react';
import {View, Text, Button, SafeAreaView} from 'react-native';
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
    <SafeAreaView
      style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Account</Text>
      <Text>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
      <Text>First Name: {firstName}</Text>
      <Text>Username: {customUsername}</Text>
      <Text>Email: {email}</Text>
      <Text>Type: {hostGuest}</Text>
      <View>
        {isAuthenticated && hostGuest === 'Host' && (
          <Button
            title="Go to Host Dashboard"
            onPress={() => navigation.navigate('HostHomepage')}
          />
        )}
        {isAuthenticated && (
          <Button
            title="Go to Guest Dashboard"
            onPress={() => navigation.navigate('GuestDashboard')}
          />
        )}
        {!isAuthenticated && (
          <Button
            title="Login"
            onPress={() => navigation.navigate('LoginScreen')}
          />
        )}
        {!isAuthenticated && (
          <Button
            title="Register"
            onPress={() => navigation.navigate('Register')}
          />
        )}
        {isAuthenticated && <Button title="Logout" onPress={handleLogout} />}
      </View>
    </SafeAreaView>
  );
};

export default Account;
