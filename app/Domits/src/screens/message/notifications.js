import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';

const Notifications = () => {
  // Placeholder data for notifications
  const notificationData = [
    { id: 1, type: 'request', message: 'Jackson has sent a request.', action: true },
    { id: 2, type: 'info', message: 'Your reservation at Mulah has been canceled.', action: true },
    { id: 3, type: 'info', message: 'Price drop for Mulah, Maldives!', action: false },
    { id: 4, type: 'info', message: 'Welcome to Domits', action: false },

  ];

  return (
    <View style={styles.container}>
      {notificationData.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </View>
  );
};

const NotificationItem = ({ notification }) => {
  const [expanded, setExpanded] = useState(notification.type === 'request');
  const [showAlert, setShowAlert] = useState(false);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const handleDenyPress = () => {
    setShowAlert(true);
  };

  const handleConfirmDeny = () => {
    console.log('Request Denied');
    setShowAlert(false);
  };

  if (notification.type === 'request' && notification.action) {
    return (
      <TouchableOpacity style={styles.requestItem} onPress={handleToggleExpand}>
        <View style={styles.notificationContent}>
          <Text style={styles.message} numberOfLines={expanded ? undefined : 1}>
            {notification.message}
          </Text>
          <Text style={styles.time}>19:40pm</Text>
        </View>
        {expanded && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptButton}>
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
          <Text style={styles.time}>13:40pm</Text>
        </View>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9f9f9',
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
