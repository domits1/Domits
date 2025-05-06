import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Text, ToastAndroid, View} from 'react-native';

import PropertyCard from '../views/PropertyCard';
import HomeTopBarTabs from '../../../header/homeTopBarTabs';

import GetWishlist from "../../../services/wishlist/GetWishlist";
import addToWishlist from "../../../services/wishlist/AddToWishlist";
import RemoveFromWishlist from "../../../services/wishlist/RemoveFromWishlist";
import PropertyRepository from "../../../services/property/propertyRepository";
import TestPropertyRepository from "../../../services/property/test/testPropertyRepository";
import Header from "../components/header";
import styles from "../styles/Home";
import ToastMessage from "../../../components/ToastMessage";
import TranslatedText from "../../../features/translation/components/TranslatedText";
import {useTranslation} from "react-i18next";

const HomeScreen = () => {
    const {t} = useTranslation();

    const [properties, setProperties] = useState([]);
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState({
        createdAt: null,
        id: null,
    });

    const [propertiesByCountry, setPropertiesByCountry] = useState([]);
    const [byCountryLastEvaluatedKey, setByCountryLastEvaluatedKey] = useState({
        id: null,
        city: null
    })

    const [country, setCountry] = useState("");

    const propertyRepository =
        process.env.REACT_APP_TESTING === "true" ? new TestPropertyRepository() : new PropertyRepository();

    const [favorites, setFavorites] = useState([]);

    const [loading, setLoading] = useState(false);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    const [originalDataSetLoaded, setOriginalDataSetLoaded] = useState(false);

    const fetchProperties = useCallback(async () => {
        setLoading(true);

        setPropertiesByCountry([])
        setByCountryLastEvaluatedKey({id: null, city: null})

        const response = await propertyRepository.fetchAllPropertyTypes(
            lastEvaluatedKey.createdAt,
            lastEvaluatedKey.id,
        );

        setProperties([...properties, ...response.properties]);
        setLastEvaluatedKey(
            response.lastEvaluatedKey ?? {createdAt: null, id: null},
        );

        originalDataSetLoaded ? setOriginalDataSetLoaded(true) : null;

        setLoading(false);
    }, [lastEvaluatedKey]);

    const fetchFavorites = useCallback(async () => {
        setFavoritesLoading(true);

        const response = await GetWishlist();

        setFavorites(response.wishlists);
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
            if (byCountryLastEvaluatedKey.id) {
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
        if (loading) {
            return (
                <View style={styles.indicators}>
                    <ActivityIndicator size="large"/>
                </View>
            );
        }

        if (!lastEvaluatedKey.createdAt && !lastEvaluatedKey.id && !byCountryLastEvaluatedKey.id && !byCountryLastEvaluatedKey.city) {
            return (
                <View style={styles.indicators}>
                    <Text style={styles.errors}>
                        <TranslatedText textToTranslate={"No property found."} />
                    </Text>
                </View>
            );
        }

        return null;
    };

    const fetchPropertiesByCountry = useCallback(async (country) => {
        setLoading(true);

        try {
            setProperties([]);
            setLastEvaluatedKey({createdAt: null, id: null});

            const response = await
                propertyRepository.fetchPropertyByCountry(
                    country, byCountryLastEvaluatedKey.id, byCountryLastEvaluatedKey.city
                );

            setByCountryLastEvaluatedKey(
                response.lastEvaluatedKey ?? {id: null, city: null},
            );

            if (response.properties.length > 0) {
                setPropertiesByCountry([...propertiesByCountry, ...response.properties]);
            } else {
                setPropertiesByCountry([])
            }
        } catch (error) {
            ToastMessage(t(error.message), ToastAndroid.SHORT)
        }
        setLoading(false);
    }, [byCountryLastEvaluatedKey]);

    return (
        <>
            <Header country={country} setCountry={setCountry} loading={loading}
                    onSearchButtonPress={fetchPropertiesByCountry}
                    onCancelButtonPress={fetchProperties}/>
            <HomeTopBarTabs/>
            {loading && originalDataSetLoaded || favoritesLoading ? (
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
