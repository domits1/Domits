import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../context/AuthContext';

const GuestDashboard = ({navigation}) => {
  const navigateTo = screen => {
    navigation.navigate(screen);
  };
  const {userAttributes} = useAuth();
  const firstName = userAttributes?.given_name || 'N/A';
  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome {firstName}</Text>
          <Text style={styles.descriptionText}>
            Manage your profile, see your payments, add or remove reviews and
            change app settings.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigateTo('GuestProfileTab')}>
          <Text style={styles.listItemText}>Profile</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        {/*<TouchableOpacity*/}
        {/*  style={styles.listItem}*/}
        {/*  onPress={() => navigateTo('HostPaymentsTab')}>*/}
        {/*  <Text style={styles.listItemText}>Payment methods</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigateTo('GuestReviewsTab')}>
          <Text style={styles.listItemText}>Reviews</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigateTo('GuestSettingsTab')}>
          <Text style={styles.listItemText}>Settings</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>

        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            Do you have trouble with using our app?{'\n'}Please send a support
            request to Domits.
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => navigateTo('HostHelpDesk')}>
            <Text style={styles.helpButtonText}>Help and feedback</Text>
          </TouchableOpacity>
        </View>
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
    marginTop: 20,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  descriptionText: {
    fontSize: 16,
    color: 'gray',
    marginTop: 8,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listItemText: {
    fontSize: 18,
  },
  helpSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 16,
    color: 'gray',
  },
  helpButton: {
    marginTop: 10,
  },
  helpButtonText: {
    fontSize: 18,
    color: '#000',
  },
});

export default GuestDashboard;
