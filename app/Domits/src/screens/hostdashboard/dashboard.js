import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const Dashboard = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Dashboard</Text>
      </View>
      <View style={styles.avatarContainer}>
        <TouchableOpacity style={styles.avatarView}>
          <View style={[styles.avatar, styles.blueBackground]}>
            <Text style={styles.placeholderText}>Icon</Text>
            <Text style={styles.placeholderText}>Total Earnings</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarView}>
          <View style={[styles.avatar, styles.darkBlueBackground]}>
            <Text style={styles.placeholderText}>Icon</Text>
            <Text style={styles.placeholderText}>Total Rented</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarView}>
          <View style={[styles.avatar, styles.lightBlueBackground]}>
            <Text style={styles.placeholderText}>Icon</Text>
            <Text style={styles.placeholderText}>Most-recent Review</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  avatarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 10,
    margin: 5,
  },
  avatarView: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 150,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  blueBackground: {
    backgroundColor: '#3498db',
  },
  darkBlueBackground: {
    backgroundColor: '#2980b9',
  },
  lightBlueBackground: {
    backgroundColor: '#5dade2',
  },
  placeholderText: {
    color: '#bdc3c7',
    fontSize: 16,
    marginBottom: 5,
    
    textAlign: 'center',
  },
});

export default Dashboard;
