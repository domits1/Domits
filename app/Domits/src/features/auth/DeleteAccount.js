import {Alert} from 'react-native';
import {deleteUser} from '@aws-amplify/auth';
import {LOGIN_SCREEN} from "../../navigation/utils/NavigationNameConstants";

const DeleteAccount = async (userId, navigation) => {
  Alert.alert(
    'Delete Account',
    'Are you sure you want to delete your account? This action cannot be undone.',
    [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteUser(userId); // Ensure account deletion completes
            navigation.navigate(LOGIN_SCREEN);
          } catch (error) {
            console.error('Failed to delete account:', error);
          }
        },
        style: 'destructive', // Makes the button appear as a destructive action on iOS
      },
    ],
    {cancelable: true}, // Allows tapping outside to cancel
  );
};

export default DeleteAccount;