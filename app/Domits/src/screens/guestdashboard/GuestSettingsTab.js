import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../context/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {deleteUser} from '../GeneralUtils/GenUtils';

const GuestSettingsTab = () => {
  const {userAttributes} = useAuth();
  const userId = userAttributes?.sub;
  const navigation = useNavigation();

  const [highContrast, setHighContrast] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(true);



  const handleDeleteAccount = async () => {
    Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
          {
            text: 'Delete',
            onPress: async () => {
              try {
                await deleteUser(userId); // Ensure account deletion completes
                navigation.navigate('LoginScreen'); // Navigate to LoginScreen after success
              } catch (error) {
                console.error('Failed to delete account:', error);
                alert('Error deleting account. Please try again.');
              }
            },
            style: 'destructive', // Makes the button appear as a destructive action on iOS
          },
        ],
        {cancelable: true} // Allows tapping outside to cancel
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Settings</Text>
        <Text style={styles.subHeader}>Change app settings</Text>

        {/*<TouchableOpacity style={styles.listItem}>*/}
        {/*  <Text style={styles.listItemText}>App language</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        {/*<TouchableOpacity style={styles.listItem}>*/}
        {/*  <Text style={styles.listItemText}>Search history</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        {/*<View style={styles.switchItem}>*/}
        {/*  <Text style={styles.listItemText}>High contrast</Text>*/}
        {/*  <Switch*/}
        {/*    trackColor={{false: '#767577', true: '#81b0ff'}}*/}
        {/*    thumbColor={highContrast ? '#f5dd4b' : '#f4f3f4'}*/}
        {/*    ios_backgroundColor="#3e3e3e"*/}
        {/*    onValueChange={setHighContrast}*/}
        {/*    value={highContrast}*/}
        {/*  />*/}
        {/*</View>*/}
        {/*<View style={styles.switchItem}>*/}
        {/*  <Text style={styles.listItemText}>Show payment info</Text>*/}
        {/*  <Switch*/}
        {/*    trackColor={{false: '#767577', true: '#81b0ff'}}*/}
        {/*    thumbColor={showPaymentInfo ? '#f5dd4b' : '#f4f3f4'}*/}
        {/*    ios_backgroundColor="#3e3e3e"*/}
        {/*    onValueChange={setShowPaymentInfo}*/}
        {/*    value={showPaymentInfo}*/}
        {/*  />*/}
        {/*</View>*/}
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('emailSettings')}>
          <Text style={styles.listItemText}>Change email/name</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('HostHelpDesk')}>
          <Text style={styles.listItemText}>Q&A Helpdesk</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.listItem, {backgroundColor: '#ffe6e6'}]}
          onPress={handleDeleteAccount}>
          <Text style={[styles.listItemText, {color: 'red'}]}>
            Delete Account
          </Text>
          <MaterialIcons name="delete" size={22} color="red" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginLeft: 20,
    marginBottom: 5,
  },
  subHeader: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 20,
    marginLeft: 20,
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
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listItemText: {
    fontSize: 18,
  },
});

export default GuestSettingsTab;
