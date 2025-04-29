import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import {PROPERTY_DETAILS_SCREEN} from '../../../navigation/utils/NavigationNameConstants';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {S3URL} from "../../../store/constants";

const PropertyCard = ({property, isFavorite, onFavoritePress}) => {
    const navigation = useNavigation();

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate(PROPERTY_DETAILS_SCREEN, {property})}>
            <Image
                source={{
                    uri: `${S3URL}${property.propertyImages[0].key}`,
                }}
                style={styles.image}
                resizeMode="cover"
            />
            <TouchableOpacity style={styles.favorite} onPress={() => onFavoritePress(property.property.id)}>
                {isFavorite ? (
                    <MaterialIcons name={"favorite"} size={30} color={"green"}/>
                ) : (
                    <MaterialIcons name={"favorite-border"} size={30} color={"green"}/>
                )}
            </TouchableOpacity>
            <View>
                <View style={styles.title}>
                    <Text
                        style={styles.address}>{property.propertyLocation.country}, {property.propertyLocation.city}</Text>
                    <Text style={styles.price}>
                        ${property.propertyPricing.roomRate}{' '}
                        <Text style={styles.night}>night</Text>
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default PropertyCard;

const styles = StyleSheet.create({
    card: {
        overflow: 'hidden',
        margin: 16,
        elevation: 4,
        color: '#000000',
    },

    image: {
        width: '100%',
        height: 400,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: 8,
    },

    favorite: {
        position: 'absolute',
        right: 20,
        top: 20
    },

    details: {
        padding: 12,
    },

    title: {
        width: '98%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    address: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        textDecorationStyle: 'solid',
    },

    price: {
        fontSize: 18,
        textDecorationLine: 'underline',
        textDecorationStyle: 'solid',
    },

    night: {
        fontWeight: 'normal',
    },
});