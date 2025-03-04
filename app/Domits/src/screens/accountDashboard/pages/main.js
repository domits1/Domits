import {StyleSheet, Text, View} from 'react-native';
import TranslatedText from '../../../features/translation/components/TranslatedText';
import {useAuth} from '../../../context/AuthContext';

const AccountDashboard = () => {
  const {userAttributes} = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <TranslatedText textToTranslate={'account dashboard title'} />
        {userAttributes.given_name} {userAttributes.family_name}!
      </Text>
      <Text style={styles.subTitle}>
        <TranslatedText textToTranslate={'account dashboard subtitle'} />
      </Text>
      <View>
        <View></View>
        <View></View>
        <View></View>
        <View></View>
        <View></View>
        <View></View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    width: '100%',
    height: '100%',
    padding: 25,
  },
  title: {
    color: '#000000',
    fontFamily: 'KanitRegular.woff',
    textDecorationStyle: 'solid',
    fontSize: 20,
  },
  subTitle: {
    color: '#000000',
    fontFamily: 'KanitRegular.woff',
    textDecorationStyle: 'solid',
    fontSize: 15,
    paddingVertical: 25,
  },
});

export default AccountDashboard;
