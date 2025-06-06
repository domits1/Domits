import {Alert} from "react-native";
import {deleteUser} from "../../GeneralUtils/GenUtils";
import {LOGIN_SCREEN} from "../../../navigation/utils/NavigationNameConstants";

export const setUserAttributes = async (userAttributes, setFirstName, setEmailAddress) => {
    try {
        setFirstName(userAttributes?.given_name);
        setEmailAddress(userAttributes?.email);
    } catch (error) {
        console.error('Error fetching user attributes:', error);
    }
};

export const deleteAccount = async (navigation, userId) => {
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
                        alert('Error deleting account. Please try again.');
                    }
                },
                style: 'destructive', // Makes the button appear as a destructive action on iOS
            },
        ],
        {cancelable: true}, // Allows tapping outside to cancel
    );
};