import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MessagesTab from './messagesTabNavigator';
import ChatScreen from '../screens/message/components/chatScreen';

import { WebSocketProvider } from '../screens/message/context/webSocketContext';
import { useAuth } from '../context/AuthContext';
import {
  MESSAGES_SCREEN,
  CHAT_SCREEN,
} from './utils/NavigationNameConstants';

const Stack = createNativeStackNavigator();

const MessagesStackNavigator = () => {
  const { userAttributes } = useAuth();
  const [userId] = useState(userAttributes?.sub || '');

  return (
    <WebSocketProvider userId={userId}>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTransparent: false,
          headerStyle: {
            backgroundColor: 'white',
          },
          headerTitle: '',
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name={MESSAGES_SCREEN}
          component={MessagesTab}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name={CHAT_SCREEN}
          component={ChatScreen}
          options={{
            headerTitle: '',
            headerBackTitleVisible: false,
          }}
        />
      </Stack.Navigator>
    </WebSocketProvider>
  );
};

export default MessagesStackNavigator;
