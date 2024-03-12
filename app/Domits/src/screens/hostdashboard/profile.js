import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const Profile = () => {
  return (
    <ScrollView style={styles.container}>
      <Text>Profile</Text>

      <View>
        <View style={styles.avatarContainer}>
          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listItemText}>Avatar</Text>
            <MaterialIcons name="chevron-right" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.listItemTitle}>Avatar</Text>
        </View>
        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.listItemText}>Email Adress</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.listItemText}>Password</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.listItemText}>Logout</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <View>
        <Text style={styles.listItemTitle}>Deactivate your account for 30 days</Text>
        <TouchableOpacity style={styles.listItem}>
          <Text style={styles.deactivateText}>Deactivate Account</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  listItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 15,
    margin: 10,
  },
  listItemText: {
    fontSize: 18,
  },
  listItemTitle: {
    fontSize: 15,
    margin: 10,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
  },
  deactivateText: {
    fontSize: 18,
    color: 'red',
  },
});


export default Profile;
