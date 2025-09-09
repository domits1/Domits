import { Image, View } from 'react-native';
import { styles } from '../styles/singleBooking';
import { S3URL } from '../../../../store/constants';

const PropertyImage = ({ imageKey }) => (
    <View style={styles.imageContainer}>
        <Image style={styles.image} source={{ uri: `${S3URL}${imageKey}` }} />
    </View>
);

export default PropertyImage;
