import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {View, Text} from 'react-native';
import MessagesStackNavigator from './messagesStackNavigator';
import MainNavigationStack from './mainNavigationStack';
import AccountNavigationStack from './accountNavigationStack';
import {useAuth} from '../context/AuthContext';

const Tab = createBottomTabNavigator();

function BottomTabNavigator() {
  const {isAuthenticated, user, userAttributes, checkAuth} = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#f0f0f0',
          borderTopColor: 'transparent',
          height: 60,
          paddingBottom: 10,
        },
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

          return (
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <MaterialIcons
                name={iconName}
                size={30}
                color={focused ? '#007AFF' : '#8e8e93'}
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
