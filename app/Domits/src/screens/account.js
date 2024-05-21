import React from 'react';
import {View, Text, Button, SafeAreaView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext'; // Ensure the path is correct
import {signOut} from '@aws-amplify/auth';

const Account = () => {
  const navigation = useNavigation();
  const {isAuthenticated, user, checkAuth} = useAuth();

  // Extracting custom username and email from user attributes
  const customUsername = user?.attributes?.['custom:username'] || 'N/A';
  const email = user?.attributes?.email || 'N/A';

  // Function to handle user logout
  const handleLogout = async () => {
    try {
      await signOut(); // Logs out the user
      checkAuth(); // Update authentication state in context
      navigation.navigate('LoginScreen'); // Navigate to login screen after logout
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  return (
    <SafeAreaView
      style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Account</Text>
      <Text>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
      <Text>Username: {customUsername}</Text>
      <Text>Email: {email}</Text>
      <View>
        <Button
          title="Go to Host Dashboard"
          onPress={() => navigation.navigate('HostHomepage')}
        />
        <Button
          title="Go to Guest Dashboard"
          onPress={() => navigation.navigate('GuestDashboard')}
        />
        <Button
          title="Login"
          onPress={() => navigation.navigate('LoginScreen')}
        />
        <Button title="Recheck Authentication" onPress={checkAuth} />
        <Button
          title="Logout"
          onPress={handleLogout} // Adds the logout functionality
        />
      </View>
    </SafeAreaView>
  );
};

export default Account;
