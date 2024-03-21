import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TabButton = ({ title, onPress, isActive }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.activeTab]}
    onPress={onPress}
  >
    <Text style={styles.tabText}>{title}</Text>
  </TouchableOpacity>
);

const Pocket = () => {
  const [activeTab, setActiveTab] = useState('coupons');

  const renderContent = () => {
    switch (activeTab) {
      case 'coupons':
        return <Text style={styles.cardText}>No Coupons here yet</Text>;
      case 'cards':
        return <Text style={styles.cardText}>No Cards here yet</Text>;
      case 'tickets':
        return <Text style={styles.cardText}>No Tickets here yet</Text>;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabsContainer}>
        <TabButton
          title="Coupons"
          onPress={() => setActiveTab('coupons')}
          isActive={activeTab === 'coupons'}
        />
        <TabButton
          title="Cards"
          onPress={() => setActiveTab('cards')}
          isActive={activeTab === 'cards'}
        />
        <TabButton
          title="Tickets"
          onPress={() => setActiveTab('tickets')}
          isActive={activeTab === 'tickets'}
        />
      </View>
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButton: {
    padding: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0D9813',
    color: '#0D9813',
  },
  tabText: {
    fontSize: 16,
    color: 'black',
  },
  cardText: {
    fontSize: 20,
  },
});

export default Pocket;
