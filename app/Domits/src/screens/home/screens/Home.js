import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, Text, View} from 'react-native';

import PropertyCard from '../views/PropertyCard';
import HomeTopBarTabs from '../../../header/homeTopBarTabs';

import GetWishlist from "../../../services/wishlist/GetWishlist";
import addToWishlist from "../../../services/wishlist/AddToWishlist";
import RemoveFromWishlist from "../../../services/wishlist/RemoveFromWishlist";
import PropertyRepository from "../../../services/property/propertyRepository";
import TestPropertyRepository from "../../../services/property/test/testPropertyRepository";
import Header from "../components/header";

const HomeScreen = () => {
    const [properties, setProperties] = useState([]);
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState({
        createdAt: null,
        id: null,
    });

    const [propertiesByCountry, setPropertiesByCountry] = useState([]);
    const [byCountrylastEvaluatedKey, setByCountrylastEvaluatedKey] = useState({
        id: null,
    })

    const [country, setCountry] = useState("");

    const propertyRepository =
        process.env.REACT_APP_TESTING === "true" ? new TestPropertyRepository() : new PropertyRepository();

    const [favorites, setFavorites] = useState([]);

    const [loading, setLoading] = useState(false);
    const [favoritesLoading, setFavoritesLoading] = useState(false);

    const fetchProperties = useCallback(async () => {
        setLoading(true);

        setPropertiesByCountry([])
        setByCountrylastEvaluatedKey({id: null})

        const response = await propertyRepository.fetchAllPropertyTypes(
            lastEvaluatedKey.createdAt,
            lastEvaluatedKey.id,
        );

        setProperties(response.properties);
        setLastEvaluatedKey(
            response.lastEvaluatedKey ?? {createdAt: null, id: null},
        );

        setLoading(false);
    }, [lastEvaluatedKey]);

    const fetchFavorites = useCallback(async () => {
        setFavoritesLoading(true);

        const response = await GetWishlist();

        setFavorites(response.AccommodationIDs);
        setFavoritesLoading(false);
    }, []);

    const onFavoritePress = (id) => {
        if (favorites.includes(id)) {
            setFavorites(favorites.filter(item => item !== id));
            RemoveFromWishlist(id)
        } else {
            setFavorites([...favorites, id]);
            addToWishlist(id);
        }
    }

    useEffect(() => {
        fetchProperties();
        fetchFavorites();
    }, []);

    const fetchNextDataSet = () => {
        if (propertiesByCountry.length > 0) {
            if (byCountrylastEvaluatedKey.id) {
                fetchPropertiesByCountry(country)
            }
        }
        if (lastEvaluatedKey.createdAt && lastEvaluatedKey.id) {
            fetchProperties();
        }
    };

    const renderFlatListItem = ({item}) => {
        return <PropertyCard
            property={item}
            isFavorite={favorites.includes(item.property.id)}
            onFavoritePress={(id) => onFavoritePress(id)}
        />;
    };

    const renderFooter = () => {
        if (!lastEvaluatedKey.createdAt && !lastEvaluatedKey.id || !byCountrylastEvaluatedKey.id) {
            return (
                <View style={{padding: 16, alignItems: 'center'}}>
                    <Text style={{color: '#666'}}>
                        No properties found.
                    </Text>
                </View>
            );
        } else {
            return <ActivityIndicator size="large"/>;
        }
    };

    const fetchPropertiesByCountry = useCallback(async (country) => {
        setLoading(true);

        setProperties([])
        setLastEvaluatedKey({createdAt: null, id: null})

        const response = await propertyRepository.fetchPropertyByCountry(country, byCountrylastEvaluatedKey.id)

        setByCountrylastEvaluatedKey(
            response.lastEvaluatedKey ?? {id: null},
        );
        if (response.properties.length > 0) {
            setPropertiesByCountry(response.properties);
        } else {
            setPropertiesByCountry([])
        }
        setLoading(false);
    }, [byCountrylastEvaluatedKey]);

    return (
        <>
            <Header country={country} setCountry={setCountry} loading={loading}
                    onSearchButtonPress={fetchPropertiesByCountry}
                    onCancelButtonPress={fetchProperties}/>
            <HomeTopBarTabs/>
            {loading || favoritesLoading ? (
                <View style={styles.activityIndicatorContainer}>
                    <ActivityIndicator size="small"/>
                </View>
            ) : (
                <FlatList
                    data={propertiesByCountry.length > 0 ? propertiesByCountry : properties}
                    renderItem={renderFlatListItem}
                    onEndReached={fetchNextDataSet}
                    onEndReachedThreshold={0.7}
                    ListFooterComponent={renderFooter}
                />
            )}
        </>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    activityIndicatorContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    }
})
