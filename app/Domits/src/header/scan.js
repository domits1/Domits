import React, {useState} from 'react'
import {Text, View, TouchableOpacity, Linking} from 'react-native'
import QRCodeScanner from 'react-native-qrcode-scanner'
// import { RNCamera } from 'react-native-camera';

const Scan = () => {
  const [data, setData] = useState('Scan a QR code')
  return (
    <QRCodeScanner
      onRead={({data}) => setData(data)}
      reactivate={true}
      reactivateTimeout={1500}
      showMarker={true}
      topContent={
        <View>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(data).catch(err =>
                console.error('An error occurred', err),
              )
            }>
            <Text
              style={{
                color: 'white',
                padding: 10,
                fontSize: 20,
                backgroundColor: 'green',
                margin: 10,
              }}>
              {data}
            </Text>
          </TouchableOpacity>
        </View>
      }
      bottomContent={
        <View>
          <Text
            style={{
              color: 'green',
              fontSize: 20,
              textTransform: 'uppercase',
              fontWeight: 700,
              padding: 10,
            }}>
            Domits QR code scanner
          </Text>
        </View>
      }
    />
  )
}

export default Scan
