import {signOut} from '@aws-amplify/auth';
import NavigateTo from "../../navigation/NavigationFunctions";

const LogoutAccount = async (navigation, checkAuth) => {
  try {
    await signOut();
    checkAuth();
    NavigateTo(navigation).login();
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export default LogoutAccount;
