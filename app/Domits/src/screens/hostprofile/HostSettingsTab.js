import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {deleteUser} from '../GeneralUtils/GenUtils';
import {useAuth} from '../../context/AuthContext';
import NavigateTo from "../../navigation/NavigationFunctions";

const HostSettings = () => {
  const navigation = useNavigation();
  const {userAttributes} = useAuth();
  const userId = userAttributes?.sub;

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
              NavigateTo(navigation).login();
            } catch (error) {
              console.error('Failed to delete account:', error);
              alert('Error deleting account. Please try again.');
            }
          },
          style: 'destructive', // Makes the button appear as a destructive action on iOS
        },
      ],
      {cancelable: true}, // Allows tapping outside to cancel
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Settings</Text>
        </View>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => NavigateTo(navigation).changeAccountSettings() }>
          <Text style={styles.listItemText}>Change email/name</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        {/*<TouchableOpacity style={styles.listItem}>*/}
        {/*  <Text style={styles.listItemText}>Change region and language</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        {/*<TouchableOpacity style={styles.listItem}>*/}
        {/*  <Text style={styles.listItemText}>Change global currency</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        {/*<TouchableOpacity style={styles.listItem}>*/}
        {/*  <Text style={styles.listItemText}>Set profile to private</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => NavigateTo(navigation).hostHelpDesk() }>
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
    marginBottom: -30,
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
    color: 'black',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 10,
    margin: 20,
    marginBottom: 0,
  },
  listItemText: {
    fontSize: 18,
    color: 'black',
  },
});

export default HostSettings;
