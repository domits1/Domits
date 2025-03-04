import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, Image} from 'react-native';
import MessagesStackNavigator from './messagesStackNavigator';
import MainNavigationStack from './mainNavigationStack';
import AccountNavigationStack from './accountNavigationStack';
import {useAuth} from '../context/AuthContext';

const Tab = createBottomTabNavigator();

function BottomTabNavigator() {
  const {isAuthenticated} = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#000000',
          height: 70,
          paddingBottom: 10,
        },
        tabBarIcon: ({focused, color, size}) => {
          const icons = {
            Home: require('../images/icons/app-home-icon-black.png'),
            Messages: require('../images/icons/app-messages-icon-black.png'),
            Account: require('../images/icons/app-account-icon-black.png'),
          };

          return (
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <Image
                source={icons[route.name]}
                style={{
                  width: 30,
                  height: 30,
                  tintColor: focused ? 'green' : 'black',
                }}
              />
              <Text
                style={{color: focused ? '#007AFF' : '#8e8e93', fontSize: 12}}>
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
      {isAuthenticated && (
        <Tab.Screen
          name="Messages"
          component={MessagesStackNavigator}
          options={{
            headerShown: false,
          }}
        />
      )}
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
