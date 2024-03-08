import React from 'react';
import {View, Text, Button} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Account = () => {
  const navigation = useNavigation();
  return (
    <View>
      <Text>Account</Text>
      <View>
          <Button title="Go to Host Dashboard" onPress={() => navigation.navigate('HostHomepage')} />
          <Button title="Go to Guest Dashboard" onPress={() => navigation.navigate('GuestDashboard')} />
        </View>
    </View>
  );
};

export default Account;
