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


const Dashboard = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Dashboard</Text>
      </View>
      <View style={styles.avatarContainer}>
        <TouchableOpacity>
          <Text>Total earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text>Total earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text>Total earnings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 10,
    margin: 5,
    borderWidth: 0.5,
    border: '#e0e0e0',
  },
  avatar: {
  }
});

export default Dashboard;
