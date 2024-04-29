import React from 'react';
import {View, Text, Button, SafeAreaView} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const Account = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView>
      <Text>Account</Text>
      <View>
        <Button
          title="Go to Host Dashboard"
          onPress={() => navigation.navigate('HostHomepage')}
        />
        <Button
          title="Go to Guest Dashboard"
          onPress={() => navigation.navigate('GuestDashboard')}
        />
          <Button
              title = "Login"
          />
      </View>
    </SafeAreaView>
  );
};

export default Account;
