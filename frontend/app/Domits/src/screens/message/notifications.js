import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import useFetchContacts from './Hooks/useFetchContacts';
import useUpdateContactRequest from './Hooks/useUpdateContactRequest';

const Notifications = ({ userId, }) => {
  const [notificationData, setNotificationData] = useState([])

  const {
    pendingContacts: hostContacts,
    loading: hostLoading,
    setContacts
  } = useFetchContacts(userId, 'host');

  const {
    pendingContacts: guestContacts,
    loading: guestLoading,
  } = useFetchContacts(userId, 'guest');

  const loading = hostLoading || guestLoading;


  useEffect(() => {
    const hostNotifications = [...hostContacts].map((contact, index) => ({
      id: `notification-${index}`,
      type: 'request',
      message: `${contact.givenName} has sent you a request.`,
      action: true,
      contactId: contact.ID
    }));
    const guestNotifications = [...guestContacts].map((contact, index) => ({
      id: `notification-${index + hostContacts.length}`,
      type: 'request',
      message: `You sent ${contact.givenName} a request.`,
    }));
    const allNotifications = [...hostNotifications, ...guestNotifications];


    setNotificationData(allNotifications);
  }, [hostContacts, guestContacts]);

  const { updateContactRequest } = useUpdateContactRequest(setContacts);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="green" />
        </View>
      ) : (
        notificationData.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            updateContactRequest={updateContactRequest}
            onRemove={() =>
              setNotificationData((prev) =>
                prev.filter((n) => n.contactId !== notification.contactId)
              )
            }
          />
        ))
      )}
    </View>
  );
};

const NotificationItem = ({ notification, updateContactRequest, onRemove }) => {
  const [expanded, setExpanded] = useState(notification.type === 'request');
  const [showAlert, setShowAlert] = useState(false);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };
  const handleAcceptPress = async () => {
    await updateContactRequest(notification.contactId, 'accepted');
     onRemove();
  };
  const handleDenyPress = () => {
    setShowAlert(true);
  };
  const handleConfirmDeny = async () => {
    await updateContactRequest(notification.contactId, 'rejected');
    setShowAlert(false);
     onRemove();
  };

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
            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptPress}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <View style={{ width: 15 }} />
            <TouchableOpacity style={styles.denyButton} onPress={handleDenyPress}>
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
                  <TouchableOpacity style={styles.alertCancel} onPress={() => setShowAlert(false)}>
                    <Text style={styles.alertButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <View style={{ width: 10 }} />

                  <TouchableOpacity style={styles.alertConfirm} onPress={handleConfirmDeny}>
                    <Text style={styles.alertButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </TouchableOpacity>
    );
  } else {
    return (
      <TouchableOpacity style={styles.notificationItem} onPress={handleToggleExpand}>
        <View style={styles.notificationContent}>
          <Text style={styles.message} numberOfLines={expanded ? undefined : 1}>
            {notification.message.length > 50 && !expanded
              ? `${notification.message.substring(0, 50)}...`
              : notification.message}
          </Text>
          {/* <Text style={styles.time}>13:40pm</Text> */}
        </View>
      </TouchableOpacity>
    );
  }
};

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
});

export default Notifications;
