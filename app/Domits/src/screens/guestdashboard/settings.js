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
const Settings = () => {
  const {userAttributes} = useAuth();
  const userId = userAttributes?.sub;
  const navigation = useNavigation();

  const [highContrast, setHighContrast] = useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = useState(true);

  const handleDeleteAccount = () => {
    navigation.navigate('login/loginScreen');
    deleteUser(userId, navigation);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Settings</Text>
        <Text style={styles.subHeader}>Change app settings</Text>

        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.listItemText}>App language</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.listItemText}>Search history</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.switchItem}>
          <Text style={styles.listItemText}>High contrast</Text>
          <Switch
            trackColor={{false: '#767577', true: '#81b0ff'}}
            thumbColor={highContrast ? '#f5dd4b' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setHighContrast}
            value={highContrast}
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.listItemText}>Show payment info</Text>
          <Switch
            trackColor={{false: '#767577', true: '#81b0ff'}}
            thumbColor={showPaymentInfo ? '#f5dd4b' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={setShowPaymentInfo}
            value={showPaymentInfo}
          />
        </View>

        {/* Delete Account Option */}
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

export default Settings;
