import React from 'react';
import { View, Text } from 'react-native'; 
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MessagesTab from './messagesTabNavigator';
import { useNavigation } from '@react-navigation/native';


const Stack = createNativeStackNavigator();

const MessagesStackNavigator = () => {
  const navigation = useNavigation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerStyle: { 
          backgroundColor: 'transparent', 
          
        
        },
        headerTitle: '',
        
        headerLeft: () => (
          <View
            style={{
              marginLeft: 15,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: 'black',
              marginTop: 10,
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={20}
              color="black"
              onPress={() => navigation.goBack()}
            />
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="Messages"
        component={MessagesTab}
        options={{
          headerTitle: '',
        }}
      />
    </Stack.Navigator>
  );
};

export default MessagesStackNavigator;
