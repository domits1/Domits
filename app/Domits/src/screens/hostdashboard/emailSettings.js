import React, {useEffect, useState} from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import {useAuth} from '../../context/AuthContext'
import {changeEmail, confirmEmailChange} from './emailConfig'
import {fetchUserAttributes} from 'aws-amplify/auth'

const NAME_UPDATE_ENDPOINT =
  'https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-UserName'

const HostSettings = () => {
  const {user, userAttributes} = useAuth()

  const [tempUser, setTempUser] = useState({email: '', name: ''})
  const [userState, setUserState] = useState({
    email: '',
    name: '',
    address: '',
    phone: '',
    family: '',
  })
  const [editState, setEditState] = useState({email: false, name: false})
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleInputChange = (key, value) => {
    setTempUser(prev => ({...prev, [key]: value}))
  }

  const toggleEditState = field => {
    setEditState(prev => ({...prev, [field]: !prev[field]}))
    setIsVerifying(false)
    if (!editState[field]) {
      setTempUser(prev => ({...prev, [field]: userState[field]}))
    }
  }

  const saveUserEmail = async () => {
    if (!user || !userAttributes) {
      Alert.alert('Error', 'User is not authenticated. Please sign in.')
      return
    }

    if (isVerifying) {
      const result = await confirmEmailChange(verificationCode)
      if (result.success) {
        try {
          const updatedAttributes = await fetchUserAttributes()
          setUserState({...userState, email: updatedAttributes.email})
          setTempUser({...tempUser, email: updatedAttributes.email})

          toggleEditState('email')
          setIsVerifying(false)

          Alert.alert(
            'Success',
            'Email verified successfully! Please restart the app to see the changes.',
            [{text: 'OK'}],
          )
        } catch (error) {
          console.error('Error fetching updated user attributes:', error)
          Alert.alert('Error', 'Email verified, but failed to refresh data.')
        }
      } else {
        Alert.alert('Error', result.error || 'Invalid verification code.')
      }
      return
    }

    const result = await changeEmail(tempUser.email)
    if (result.success) {
      setIsVerifying(true)
      Alert.alert('Verification Code Sent', result.message)
    } else {
      Alert.alert('Error', result.error || 'Failed to update email.')
    }
  }

  const saveUserName = async () => {
    if (!user || !userAttributes) {
      Alert.alert('Error', 'User is not authenticated. Please sign in.')
      return
    }

    const userId = user.username
    const newName = tempUser.name

    if (!newName.trim()) {
      Alert.alert('Invalid Name', 'Name cannot be empty.')
      return
    }

    try {
      const params = {userId, newName}
      const response = await fetch(NAME_UPDATE_ENDPOINT, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(params),
      })

      const result = await response.json()

      if (result.statusCode === 200) {
        setUserState({...userState, name: newName})
        toggleEditState('name')

        Alert.alert(
          'Success',
          'Name updated successfully! Please restart the app to see the changes.',
          [{text: 'OK'}],
        )
      } else {
        Alert.alert('Error', 'Failed to update the name. Please try again.')
      }
    } catch (error) {
      console.error('Error updating username:', error)
      Alert.alert(
        'Error',
        'An error occurred while updating your name. Please try again.',
      )
    }
  }

  useEffect(() => {
    if (userAttributes) {
      setUserState({
        email: userAttributes.email || '',
        name: userAttributes.given_name || '',
        address: userAttributes.address || '',
        phone: userAttributes.phone_number || '',
        family: '2 adults - 2 kids',
      })
      setTempUser({
        email: userAttributes.email || '',
        name: userAttributes.given_name || '',
      })
    }
  }, [userAttributes])

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Host Dashboard</Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Email:</Text>
          {editState.email ? (
            <View style={styles.row}>
              {!isVerifying ? (
                <>
                  <TextInput
                    value={tempUser.email}
                    onChangeText={value => handleInputChange('email', value)}
                    style={styles.input}
                    placeholder="Enter new email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={saveUserEmail}>
                    <Text style={styles.actionText}>Save</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    style={styles.input}
                    placeholder="Verification code"
                  />
                  <TouchableOpacity onPress={saveUserEmail}>
                    <Text style={styles.actionText}>Verify</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.row}>
              <Text>{userState.email}</Text>
              <TouchableOpacity onPress={() => toggleEditState('email')}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Name:</Text>
          {editState.name ? (
            <View style={styles.row}>
              <TextInput
                value={tempUser.name}
                onChangeText={value => handleInputChange('name', value)}
                style={styles.input}
                placeholder="Enter new name"
              />
              <TouchableOpacity onPress={saveUserName}>
                <Text style={styles.actionText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.row}>
              <Text>{userState.name}</Text>
              <TouchableOpacity onPress={() => toggleEditState('name')}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: 'white'},
  container: {flex: 1, padding: 20, backgroundColor: '#fff', marginTop: '15%'},
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 20},
  infoBox: {marginBottom: 20},
  label: {fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: 'black'},
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    fontSize: 16,
    height: 50,
  },
  row: {flexDirection: 'row', alignItems: 'center'},
  actionText: {color: '#007BFF', fontWeight: 'bold'},
})

export default HostSettings
