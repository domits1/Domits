import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import HomePage from '../screens/homeScreen';
import Messages from '../screens/messages';
import AccountPage from '../screens/account';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Messages') {
            iconName = 'message';
          } else if (route.name === 'Account') {
            iconName = 'account-circle';
          }

          return (
            <View style={styles.tabItem}>
              <MaterialIcons name={iconName} size={size} color={color} />
              <Text style={styles.tabLabel(focused)}>{route.name}</Text>
            </View>
          );
        },
      })}
      tabBarOptions={{
        activeTintColor: '#ffffff',
        inactiveTintColor: '#8e8e93',
        activeBackgroundColor: '#007AFF', // Change this color to your desired highlight color
        style: styles.tabBar,
      }}>
      <Tab.Screen name="Home" component={HomePage} />
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Account" component={AccountPage} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'white',
    borderTopColor: 'transparent',
    height: 60,
    paddingBottom: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: focused => ({
    color: focused ? '#ffffff' : '#8e8e93',
    fontSize: 12,
  }),
});
export default BottomTabNavigator;
