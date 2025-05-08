import {StyleSheet, View} from 'react-native';

const Spacer = () => {
  return <View style={styles.spacer} />;
};

const styles = StyleSheet.create({
  spacer: {
    padding: 10,
  },
});

export default Spacer;
