import React, {useState} from 'react';
import {SafeAreaView, StyleSheet, TouchableOpacity,} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useAuth} from '../context/AuthContext';
import DeleteAccount from '../features/auth/DeleteAccount';
import LogoutAccount from '../features/auth/LogoutAccount';
import TranslatedText from '../features/translation/components/TranslatedText';
import LoadingScreen from "./loadingscreen/screens/LoadingScreen";
import {LOGIN_SCREEN} from "../navigation/utils/NavigationNameConstants";

const Account = () => {
  const navigation = useNavigation();
  const {isAuthenticated, user, checkAuth} = useAuth();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      if (!isAuthenticated) {
          navigation.navigate(LOGIN_SCREEN);
      } else {
        setLoading(false);
      }
    }, [isAuthenticated, navigation]),
  );

  if (loading) {
    return (
      <LoadingScreen loadingName={'account'}/>
    );
  } else {
    return (
      <SafeAreaView style={styles.items}>
        <TouchableOpacity
          onPress={() => LogoutAccount(navigation, checkAuth)}
          style={styles.listItem}>
          <TranslatedText textToTranslate={'logout'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => DeleteAccount(user.userId, navigation)}
          style={styles.listItem}>
          <TranslatedText textToTranslate={'delete account'} />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});

export default Account;
