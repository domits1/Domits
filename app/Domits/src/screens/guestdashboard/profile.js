import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const SettingsScreen = ({navigation}) => {
  const navigateTo = screen => {
    navigation.navigate(screen);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Profile</Text>
        <Text style={styles.headerSubText}>Change your profile settings.</Text>
      </View>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={() => navigateTo('EditAvatar')}>
        <Text style={styles.listItemText}>Avatar</Text>
        <Image source={{uri: 'avatar_url'}} style={styles.avatar} />
        <MaterialIcons name="chevron-right" size={22} color="#000" />
      </TouchableOpacity>
      {['Email address', 'Password', 'Logout'].map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.listItem}
          onPress={() => navigateTo(item.replace(/\s+/g, ''))}>
          <Text style={styles.listItemText}>{item}</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.deactivateButton}
        onPress={() => navigateTo('DeactivateAccount')}>
        <Text style={styles.deactivateButtonText}>
          Deactivate account for 30 days
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubText: {
    fontSize: 14,
    color: 'gray',
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
    fontSize: 16,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  deactivateButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  deactivateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
});

export default SettingsScreen;