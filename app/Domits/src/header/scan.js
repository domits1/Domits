// import React from 'react';
// import { View, Text, Button, StyleSheet } from 'react-native';
// import { RNCamera } from 'react-native-camera';
// import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// const ScanScreen = () => {
//   const checkCameraPermission = async () => {
//     const result = await check(PERMISSIONS.IOS.CAMERA);
//     if (result === RESULTS.DENIED) {
//       const requestResult = await request(PERMISSIONS.IOS.CAMERA);
//       if (requestResult === RESULTS.GRANTED) {
//         console.log('Camera permission granted');
//       }
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <RNCamera
//         style={styles.preview}
//         type={RNCamera.Constants.Type.back}
//         flashMode={RNCamera.Constants.FlashMode.on}
//         androidCameraPermissionOptions={{
//           title: 'Toestemming voor camera gebruik',
//           message: 'We hebben jouw toestemming nodig om de camera te gebruiken',
//           buttonPositive: 'Ok',
//           buttonNegative: 'Annuleren',
//         }}
//         onBarCodeRead={barcode => {
//           console.log(barcode);
//         }}
//       />
//       <View style={{ flex: 0, flexDirection: 'row', justifyContent: 'center' }}>
//         <Button title="Check Camera Permission" onPress={checkCameraPermission} />
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     flexDirection: 'column',
//     backgroundColor: 'black',
//   },
//   preview: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//   },
// });

// export default ScanScreen;

// import React, { useState } from 'react';
// import { View, Text, Button, StyleSheet, Linking, TouchableOpacity } from 'react-native';
// import { RNCamera } from 'react-native-camera';
// import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// const ScanScreen = () => {
//   const [scannedUrl, setScannedUrl] = useState('');

//   const checkCameraPermission = async () => {
//     const result = await check(PERMISSIONS.IOS.CAMERA);
//     if (result === RESULTS.DENIED) {
//       const requestResult = await request(PERMISSIONS.IOS.CAMERA);
//       if (requestResult === RESULTS.GRANTED) {
//         console.log('Camera permission granted');
//       }
//     }
//   };

//   const handleBarCodeRead = ({type, data}) => {
//     console.log(`Scanned type: ${type}, data: ${data}`);
//     if (type === 'QR_CODE' && validateUrl(data)) {
//       setScannedUrl(data);
//     }
//   };

//   // const validateUrl = (url) => {
//   //   const pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
//   //     '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
//   //     '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
//   //     '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
//   //     '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
//   //     '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
//   //   return !!pattern.test(url);
//   // };

//   const validateUrl = (url) => {
//     // Tijdelijk elke string accepteren om te zien of het probleem bij de validatie ligt
//     return true;
//   };

//   return (
//     <View style={styles.container}>
//       <RNCamera
//         style={styles.preview}
//         type={RNCamera.Constants.Type.back}
//         flashMode={RNCamera.Constants.FlashMode.on}
//         onBarCodeRead={handleBarCodeRead}
//         androidCameraPermissionOptions={{
//           title: 'Toestemming voor camera gebruik',
//           message: 'We hebben jouw toestemming nodig om de camera te gebruiken',
//           buttonPositive: 'Ok',
//           buttonNegative: 'Annuleren',
//         }}
//       />
//       {scannedUrl ? (
//         <TouchableOpacity style={styles.linkContainer} onPress={() => Linking.openURL(scannedUrl)}>
//           <Text style={styles.linkText}>Open URL: {scannedUrl}</Text>
//         </TouchableOpacity>
//       ) : null}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     flexDirection: 'column',
//     backgroundColor: 'black',
//   },
//   preview: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//   },
//   linkContainer: {
//     padding: 10,
//     backgroundColor: 'white',
//   },
//   linkText: {
//     color: 'blue',
//     textDecorationLine: 'underline',
//   },
//   buttonContainer: {
//     flex: 0, 
//     flexDirection: 'row', 
//     justifyContent: 'center',
//     margin: 20,
//   },
// });

// export default ScanScreen;

// import React from 'react'

// const ScanScreen = () => {
//     return (

//     )
//   };

//   export default ScanScreen