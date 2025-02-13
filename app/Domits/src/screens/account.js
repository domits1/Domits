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
import DeleteAccount from '../features/auth/DeleteAccount';

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
        <TouchableOpacity
          onPress={() => handleLogout()}
          style={styles.listItem}>
          <Text>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => DeleteAccount(user.userId, navigation)}
          style={styles.listItem}>
          <Text>Delete Account</Text>
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});

export default Account;
