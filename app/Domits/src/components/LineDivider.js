import {Divider} from 'react-native-paper';
import Spacer from './Spacer';
import {StyleSheet} from 'react-native';

const LineDivider = ({width = null}) => {
  return (
    <>
      <Spacer />
      <Divider style={[styles.divider, {width: width || '85%'}]} />
      <Spacer />
    </>
  );
};

const styles = StyleSheet.create({
  divider: {
    alignSelf: 'center',
    height: 2,
  },
});

export default LineDivider;
