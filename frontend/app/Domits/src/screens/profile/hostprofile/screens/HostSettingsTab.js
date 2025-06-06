import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../../context/AuthContext';
import {deleteAccount} from "../../utils/ProfileFunctions";
import {CHANGE_ACCOUNT_SETTINGS_SCREEN, HOST_HELP_DESK_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";

const HostSettings = (navigation) => {
  const {userAttributes} = useAuth();
  const userId = userAttributes?.sub;

  const handleDeleteAccount = () => {
    deleteAccount(navigation, userId).then();
  }

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Settings</Text>
        </View>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate(CHANGE_ACCOUNT_SETTINGS_SCREEN) }>
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
          onPress={() => navigation.navigate(HOST_HELP_DESK_SCREEN) }>
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
