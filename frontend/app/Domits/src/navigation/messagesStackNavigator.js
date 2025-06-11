import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MessagesTab from './messagesTabNavigator';
import { useNavigation } from '@react-navigation/native';
import ChatScreen from '../screens/message/components/chatScreen';

import { WebSocketProvider } from '../screens/message/context/webSocketContext';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

const MessagesStackNavigator = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Notifications');
  const { userAttributes } = useAuth();
  const [userId] = useState(userAttributes?.sub || '');

  return (
    <WebSocketProvider userId={userId}>
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
          name="MESSAGES_SCREEN"
          component={MessagesTab}
          options={{
            headerTitle: '',
          }}
        />
        <Stack.Screen
          name="CHAT_SCREEN"
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
    </WebSocketProvider>
  );
};

export default MessagesStackNavigator;
