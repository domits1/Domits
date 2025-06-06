import { Text, View } from 'react-native';
import { styles } from '../styles/singleBooking';
import TranslatedText from "../../../../features/translation/components/TranslatedText";

const formatDate = (timestamp) =>
    new Date(parseFloat(timestamp)).toISOString().split('T')[0];

const BookingDetailsView = ({ booking }) => (
    <View style={styles.bookingContainer}>
        <Text style={styles.bookingTitle}>Booking</Text>
        <Text style={styles.bookingSubTitle}>Status: {booking.status.S}</Text>
        <Text style={styles.bookingSubTitle}>
            <TranslatedText textToTranslate={"Period:"} />{' '} {formatDate(booking.arrivalDate.N)} -{' '}
            {formatDate(booking.departureDate.N)}
        </Text>
    </View>
);

export default BookingDetailsView;
