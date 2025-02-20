import {Alert} from 'react-native'

/**
 * Deletes a user account by making an API call.
 * @param {string} userId - The ID of the user to delete.
 * @param {function} navigation - Navigation object to redirect after deletion.
 */
export const deleteUser = async (userId, navigation) => {
  Alert.alert(
    'Confirm Deletion',
    'Are you sure you want to delete your account? This action cannot be undone.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(
              `https://wdtvribq27.execute-api.eu-north-1.amazonaws.com/default/DeleteUser?userId=${userId}`,
              {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
              },
            )

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.message || 'Failed to delete user')
            }

            const data = await response.json()
            Alert.alert('Success', data.message)

            // Navigate to the login screen
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}], // Adjust 'Login' if your route name differs
            })
          } catch (error) {
            console.error('Error deleting user:', error)
            Alert.alert('Error', error.message || 'Failed to delete account')
          }
        },
      },
    ],
  )
}
