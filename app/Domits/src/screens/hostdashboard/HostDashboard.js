import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../context/AuthContext';

const HostDashboard = () => {
  const navigation = useNavigation();
  const {userAttributes} = useAuth();
  const firstName = userAttributes?.given_name || 'N/A';

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome: {firstName}</Text>
          <Text style={styles.descriptionText}>
            Manage your profile, see your payments, add or remove reviews and
            change app settings.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('OnboardingHost')}>
          <Text style={styles.listItemText}>Onboarding</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('HostDashboardTab')}>
          <Text style={styles.listItemText}>Dashboard</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        {/*<TouchableOpacity*/}
        {/*  style={styles.listItem}*/}
        {/*  onPress={() => navigation.navigate('HostCalendarTab')}>*/}
        {/*  <Text style={styles.listItemText}>Calendar</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('HostProfileTab')}>
          <Text style={styles.listItemText}>Profile</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        {/*<TouchableOpacity*/}
        {/*  style={styles.listItem}*/}
        {/*  onPress={() => navigation.navigate('HostPayments')}>*/}
        {/*  <Text style={styles.listItemText}>HostPaymentsTab</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('HostListingsTab')}>
          <Text style={styles.listItemText}>Listings</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('GuestSettingsTab')}>
          <Text style={styles.listItemText}>Settings</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        {/*<TouchableOpacity*/}
        {/*  style={styles.listItem}*/}
        {/*  onPress={() => navigation.navigate('HostRevenue')}>*/}
        {/*  <Text style={styles.listItemText}>Revenue Tool</Text>*/}
        {/*  <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*</TouchableOpacity>*/}
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation.navigate('GuestReviewsTab')}>
          <Text style={styles.listItemText}>Reviews</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.helpSection}>
          <Text style={styles.helpText}>
            Do you have trouble with using our app?{'\n'}Please send a support
            request to Domits.
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => navigation.navigate('HostHelpDesk')}>
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
    color: 'black',
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

export default HostDashboard;
