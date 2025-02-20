import React, {useEffect, useState} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import {SafeAreaView} from 'react-native-safe-area-context'
import {useAuth} from '../../context/AuthContext'

const HostProfileTab = () => {
  const {userAttributes} = useAuth()
  const [firstName, setFirstName] = useState('')
  const [emailAddress, setEmailAddress] = useState('')

  useEffect(() => {
    const fetchUserAttributes = async () => {
      try {
        setFirstName(userAttributes?.given_name)
        setEmailAddress(userAttributes?.email)
      } catch (error) {
        console.error('Error fetching user attributes:', error)
      }
    }

    fetchUserAttributes()
  }, [userAttributes])

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Profile</Text>
        </View>

        <View>
          <View style={styles.avatarContainer}>
            <View style={styles.listItem}>
              <Text style={styles.listItemText}>Name: {firstName}</Text>
            </View>
          </View>
          <View style={styles.listItem}>
            <Text style={styles.listItemText}>Email: {emailAddress}</Text>
          </View>
        </View>
        {/*  <View style={styles.listItem}>*/}
        {/*    <Text style={styles.listItemText}>Logout</Text>*/}
        {/*    <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*  </View>*/}
        {/*</View>*/}

        {/*<View>*/}
        {/*  <Text style={styles.listItemTitle}>*/}
        {/*    Deactivate your account for 30 days*/}
        {/*  </Text>*/}
        {/*  <TouchableOpacity style={styles.listItem}>*/}
        {/*    <Text style={styles.deactivateText}>Deactivate Account</Text>*/}
        {/*    <MaterialIcons name="chevron-right" size={22} color="#000" />*/}
        {/*  </TouchableOpacity>*/}
        {/*</View>*/}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 30,
    marginTop: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    margin: 10,
  },
  listItemText: {
    fontSize: 18,
  },
  listItemTitle: {
    fontSize: 15,
    margin: 10,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deactivateText: {
    fontSize: 18,
    color: 'red',
  },
})

export default HostProfileTab
