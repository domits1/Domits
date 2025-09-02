import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {View, Text, Image} from 'react-native';
import MessagesStackNavigator from './messagesStackNavigator';
import MainNavigationStack from './mainNavigationStack';
import AccountNavigationStack from './accountNavigationStack';
import {useAuth} from '../context/AuthContext';
import {styles} from './styles/BottomTabNavigatorStyles';

const Tab = createBottomTabNavigator();

function BottomTabNavigator() {
  const {isAuthenticated, user, userAttributes, checkAuth} = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarShowLabel: false,
        tabBarStyle: {...styles.bottomTabBar},
        tabBarItemStyle: {...styles.tabBarItem},
        tabBarIcon: ({focused, color, size}) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Messages':
              iconName = 'message';
              break;
            case 'Account':
              iconName = 'account-circle';
              break;
            default:
              iconName = 'circle';
          }

          const tint = focused ? styles.navItemFocusedColor.color : styles.navItemDefaultColor.color;

          if (route.name === 'Messages') {
            // Use a custom PNG for the Messages tab. Replace the file with your own PNG if desired.
            const messagesIcon = require('../images/icons/message.png');
            return (
              <View style={styles.navigationItem}>
                <Image
                  source={messagesIcon}
                  style={{width: 26, height: 26, tintColor: tint}}
                  resizeMode="contain"
                />
                <Text style={[styles.navigationItemText, {color: tint}]}>
                  {route.name}
                </Text>
              </View>
            );
          }

          return (
            <View style={styles.navigationItem}>
              <MaterialIcons name={iconName} size={30} color={tint} />
              <Text style={[styles.navigationItemText, {color: tint}]}>
                {route.name}
              </Text>
            </View>
          );
        },
      })}>
      <Tab.Screen
        name="Home"
        component={MainNavigationStack}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStackNavigator}
        options={{
          headerShown: false,
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountNavigationStack}
        options={{
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default BottomTabNavigator;
