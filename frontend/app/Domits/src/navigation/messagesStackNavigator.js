import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MessagesTab from './messagesTabNavigator';
import { useNavigation } from '@react-navigation/native';
import ChatScreen from '../screens/message/chatScreen';
import { getGivenName } from '../screens/message/chatScreen';
import Animated, { Easing, withTiming } from 'react-native-reanimated'


const Stack = createNativeStackNavigator();

const MessagesStackNavigator = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Notifications');

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerStyle: {
          backgroundColor: 'white',


        },
        headerTitle: '',

        header: () => (
          <View
            style={{
              backgroundColor: 'white',
              padding: 5,
              height: 60,
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                borderRadius: 20,
                borderWidth: 2,
                borderColor: 'black',
                width: 25,
                height: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 15,
              }}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color="black"
                onPress={() => navigation.goBack()}
              />
            </View>
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="MessagesScreen"
        component={MessagesTab}
        options={{
          headerTitle: '',
        }}
      />
      {/* <Stack.Screen name="ChatScreen" component={ChatScreen} /> */}
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          header: () => (
            <View
              style={{
                backgroundColor: 'white',
                padding: 5,
                height: 60,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
                shadowColor: 'black',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
                elevation: 3,
              }}
            >
              <View
                style={{
                  backgroundColor: 'white',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: 'black',
                    width: 25,
                    height: 25,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 15,

                  }}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={20}
                    color="black"


                    onPress={() => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Messages' }],
                      });
                      setActiveTab('Inbox')
                    }}
                  />

                </View>
                <Text
                  style={{
                    marginLeft: 28,
                    fontSize: 20,
                    color: 'black',
                    fontWeight: '700',
                  }}
                >
                  {/* {givenName} */}
                  {/* Micheal */}
                </Text>
              </View>
              <MaterialIcons
                name="more-horiz"
                size={26}
                color="green"


                onPress={() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Messages' }],
                  });
                  setActiveTab('Inbox')
                }}
              />
            </View>
          ),
        }}
      />
    </Stack.Navigator>
  );
};

export default MessagesStackNavigator;
