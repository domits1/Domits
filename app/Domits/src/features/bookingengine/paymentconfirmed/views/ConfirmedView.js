import {styles} from '../styles/styles';
import {Text, View} from 'react-native';
import Spacer from '../../../../components/Spacer';
import TranslatedText from "../../../translation/components/TranslatedText";

const ConfirmedView = ({userAttributes}) => {

    return (
        <View style={[styles.confirmedContainer, {maxHeight: 105}]}>
            <View style={styles.confirmedContent}>
                <Text style={styles.confirmedLabel}><TranslatedText textToTranslate={'Payment confirmed'} /></Text>
                <Spacer padding={5} />
                <Text style={styles.confirmedTextContent}>
                    <TranslatedText textToTranslate={"Your payment has been confirmed"} />
                </Text>
                <Text style={styles.confirmedTextContent}>
                    [ {userAttributes.given_name.charAt(0)}. {userAttributes.family_name} ]
                </Text>
            </View>
        </View>
    );
};

export default ConfirmedView;
