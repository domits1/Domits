import {signOut} from '@aws-amplify/auth';

const LogoutAccount = async (navigation, checkAuth) => {
  try {
    await signOut(); // Logs out the user
    checkAuth(); // Update authentication state in context
    navigation.navigate('Login'); // Navigate to login screen after logout
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export default LogoutAccount;
