import {Image, Text, TouchableOpacity, View} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import {PROPERTY_DETAILS_SCREEN} from '../../../navigation/utils/NavigationNameConstants';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {S3URL} from "../../../store/constants";
import styles from "../styles/PropertyCard";

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
