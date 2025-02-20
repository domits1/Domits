import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import DeleteProperty from '../features/hostdashboard/hostproperty/services/DeleteProperty';

const Bookings = () => {
  const [sessions, setSessions] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function doDeleteProperty() {
      setResult(await DeleteProperty());
    }

    doDeleteProperty();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>No Bookings</Text>
      <Text>{result}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: '15%',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 50,
  },
});

export default Bookings;
