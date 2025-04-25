import {signOut} from '@aws-amplify/auth';
import {LOGIN_SCREEN} from "../../navigation/utils/NavigationNameConstants";

const LogoutAccount = async (navigation, checkAuth) => {
  try {
    await signOut();
    checkAuth();
    navigation.navigate(LOGIN_SCREEN);
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export default LogoutAccount;
