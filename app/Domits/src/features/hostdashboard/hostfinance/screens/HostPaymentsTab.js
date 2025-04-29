import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {styles} from '../styles/HostPaymentsStyles';

const HostPaymentsTab = () => {
  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Payments</Text>
        </View>
        <View style={styles.boxColumns}>
          <View style={styles.box}>
            <Text style={styles.boxText}>Completed Payments</Text>
            <Text>Payment Info</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxText}>Pending Payments</Text>
            <Text>Payment Info</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxText}>Cancelled Payments</Text>
            <Text>Payment Info</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxText}>Open Payments</Text>
            <Text>Payment Info</Text>
          </View>

          <View style={styles.boxRows}>
            <View style={[styles.box, styles.halfBox]}>
              <Text style={styles.boxText}>Payments</Text>
              <Text>Payment Info</Text>
            </View>
            <View style={[styles.box, styles.halfBox]}>
              <Text style={styles.boxText}>Payments</Text>
              <Text>Payment Info</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HostPaymentsTab;
