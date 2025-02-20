import React, {useState, useEffect} from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native'
import {useAuth} from '../../context/AuthContext'

const Notifications = () => {
  const [notificationData, setNotificationData] = useState([])
  const [pendingContacts, setPendingContacts] = useState([])
  const {isAuthenticated, userAttributes, checkAuth} = useAuth()
  const userId = userAttributes?.sub
  const [fullName, setFullName] = useState(null)
  const [givenName, setGivenName] = useState(null)
  const [contactUserId, setContactUserID] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchHostContacts()
    }
  }, [userId])

  const fetchHostContacts = async () => {
    setLoading(true)
    setPendingContacts([])
    const notifications = []

    try {
      const response = await fetch(
        'https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({hostID: userId}),
        },
      )

      if (!response.ok) throw new Error('Failed to fetch host information')

      const {pending} = await response
        .json()
        .then(data => JSON.parse(data.body))
      setPendingContacts(pending)

      console.log(pending)

      // Fetch user info for each pending contact and build notification messages
      await Promise.all(
        pending.map(async item => {
          const attributes = await fetchUserInfo(item.userId)
          if (attributes && attributes['given_name']) {
            const message = `${attributes['given_name']} has sent you a request.`
            notifications.push({
              id: item.ID,
              type: 'request',
              message,
              action: true,
            })
          }
        }),
      )

      // Set the notification data
      setNotificationData(notifications)
    } catch (error) {
      console.error('Error fetching host contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserInfo = async userId => {
    try {
      const requestData = {OwnerId: userId}

      const response = await fetch(
        `https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(requestData),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to fetch user information')
      }

      const responseData = await response.json()
      const parsedData = JSON.parse(responseData.body)[0]
      const attributes = parsedData.Attributes.reduce((acc, attribute) => {
        acc[attribute.Name] = attribute.Value
        return acc
      }, {})

      // console.log(`Fetching user info for userId: ${userId}`);
      // console.log("Fetched Attributes:", attributes);

      // Log the userId being set to the state
      setGivenName(attributes['given_name'])
      setContactUserID(parsedData.Attributes[2].Value) // Assuming it's always at index 2
      // console.log(`User ID set to Contact User ID: ${parsedData.Attributes[2].Value}`);

      return attributes
    } catch (error) {
      console.error('Error fetching user info:', error)
    }
  }

  const updateContactRequest = async (id, status) => {
    try {
      const response = await fetch(
        'https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/UpdateContactRequest',
        {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({Id: id, Status: status}),
        },
      )

      if (!response.ok) throw new Error('Failed to update contact request')

      const data = await response.json()
      const parsedData = JSON.parse(data.body)
      console.log(`Request ${status}:`, parsedData)
      if (parsedData.isAccepted) {
        const result = await API.graphql({
          query: mutations.createChat,
          variables: {
            input: {
              text: '',
              userId: userId,
              recipientId: origin,
              isRead: false,
              createdAt: new Date().toISOString(),
              channelID: channelUUID,
            },
          },
        })
        console.log(result)
      }

      // Update the pending contacts state after accepting or rejecting a request
      setPendingContacts(prev => prev.filter(contact => contact.userId !== id))
      setNotificationData(prev =>
        prev.filter(notification => notification.id !== id),
      )

      return data
    } catch (error) {
      console.error('Error updating contact request:', error)
      Alert.alert(
        'Error',
        'Failed to update the contact request. Please try again.',
      )
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="grey" />
          {/* <Text style={styles.loadingText}>Loading Notifications...</Text> */}
        </View>
      ) : (
        notificationData.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            updateContactRequest={updateContactRequest}
          />
        ))
      )}
    </View>
  )
}

const NotificationItem = ({notification, updateContactRequest}) => {
  const [expanded, setExpanded] = useState(notification.type === 'request')
  const [showAlert, setShowAlert] = useState(false)

  const handleToggleExpand = () => {
    setExpanded(!expanded)
  }
  const handleAcceptPress = async () => {
    await updateContactRequest(notification.id, 'accepted')
  }
  const handleDenyPress = () => {
    setShowAlert(true)
  }
  const handleConfirmDeny = async () => {
    await updateContactRequest(notification.id, 'rejected')
    setShowAlert(false)
  }

  if (notification.type === 'request' && notification.action) {
    return (
      <TouchableOpacity style={styles.requestItem} onPress={handleToggleExpand}>
        <View style={styles.notificationContent}>
          <Text style={styles.message} numberOfLines={expanded ? undefined : 1}>
            {notification.message}
          </Text>
          <Text style={styles.time}></Text>
        </View>
        {expanded && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptPress}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <View style={{width: 15}} />
            <TouchableOpacity
              style={styles.denyButton}
              onPress={handleDenyPress}>
              <Text style={styles.buttonText}>Deny</Text>
            </TouchableOpacity>
          </View>
        )}
        {showAlert && (
          <Modal transparent animationType="fade">
            <View style={styles.alertOverlay}>
              <View style={styles.alertBox}>
                <Text style={styles.alertMessage}>
                  Are you sure you want to reject this contact request?
                </Text>
                <View style={styles.alertActions}>
                  <TouchableOpacity
                    style={styles.alertCancel}
                    onPress={() => setShowAlert(false)}>
                    <Text style={styles.alertButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <View style={{width: 10}} />

                  <TouchableOpacity
                    style={styles.alertConfirm}
                    onPress={handleConfirmDeny}>
                    <Text style={styles.alertButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </TouchableOpacity>
    )
  } else {
    return (
      <TouchableOpacity
        style={styles.notificationItem}
        onPress={handleToggleExpand}>
        <View style={styles.notificationContent}>
          <Text style={styles.message} numberOfLines={expanded ? undefined : 1}>
            {notification.message.length > 50 && !expanded
              ? `${notification.message.substring(0, 50)}...`
              : notification.message}
          </Text>
          <Text style={styles.time}>13:40pm</Text>
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: 'white',
  },
  requestItem: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: '#E0F7E9', // Different color for requests
    flexDirection: 'column',
  },
  notificationItem: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: '#E0F7E9',
    flexDirection: 'column',
  },
  notificationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 10,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
  },
  denyButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#D32F2F',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertBox: {
    width: 280,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#FFFBF2',
    alignItems: 'center',
    elevation: 5,
  },
  alertMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCancel: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#BDBDBD',
  },
  alertConfirm: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#D32F2F',
  },
  alertButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
})

export default Notifications
