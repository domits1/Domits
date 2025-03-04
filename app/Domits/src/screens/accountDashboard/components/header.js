import {Image, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const AccountDashboardHeader = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        onPress={navigation.goBack}
        style={styles.contentContainer}>
        <Image
          source={require('../../../images/icons/app-back-icon-black.png')}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    display: 'flex',
    elevation: 2,
    width: '100%',
    padding: 15,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flexDirection: 'row',
    alignContent: 'center',
  },
});

export default AccountDashboardHeader;
