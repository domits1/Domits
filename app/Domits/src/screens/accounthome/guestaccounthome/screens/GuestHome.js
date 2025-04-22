import React from 'react';
import {ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../../context/AuthContext';
import {styles} from '../../styles/AccountHomeStyles';

const GuestHome = ({navigation}) => {
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

export default GuestHome;
