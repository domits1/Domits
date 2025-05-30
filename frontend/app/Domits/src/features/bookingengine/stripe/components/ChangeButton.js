import {Text, TouchableOpacity, View} from 'react-native';
import {styles} from '../styles/styles';

const ChangeButton = ({onChangePress}) => {
  return (
    <TouchableOpacity onPress={() => onChangePress()}>
      <Text style={styles.changeButton}>Change</Text>
      <View style={styles.underline}></View>
    </TouchableOpacity>
  );
};

export default ChangeButton;
