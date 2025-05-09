import {View} from 'react-native';

const Spacer = ({padding = null}) => {
  return <View style={{padding: padding || 10}} />;
};

export default Spacer;
