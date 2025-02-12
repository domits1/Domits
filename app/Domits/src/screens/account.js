import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext';
import {signOut} from '@aws-amplify/auth';

const Account = () => {
  const navigation = useNavigation();
  const {isAuthenticated, user, userAttributes, checkAuth} = useAuth();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      if (!isAuthenticated) {
        navigation.navigate('Login');
      } else {
        setLoading(false);
      }
    }, [isAuthenticated, navigation]),
  );

  const handleLogout = async () => {
    try {
      await signOut(); // Logs out the user
      checkAuth(); // Update authentication state in context
      navigation.navigate('Login'); // Navigate to login screen after logout
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  } else {
    return (
      <SafeAreaView style={styles.items}>
        <Text>Account Screen.</Text>
        <TouchableOpacity onPress={() => handleLogout()}>
          <Text>Logout</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Account;
