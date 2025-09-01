import {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, Text, ToastAndroid, View} from 'react-native';
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
import LoadingScreen from "../../loadingscreen/screens/LoadingScreen";

const HomeScreen = () => {
    const {t} = useTranslation();

    const lastFetchTimeRef = useRef(0);
    const FETCH_INTERVAL = 1000; // 1 second

    const propertyRepository =
        process.env.REACT_APP_TESTING === "true" ? new TestPropertyRepository() : new PropertyRepository();

    const [properties, setProperties] = useState([]);
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState({
        createdAt: null,
        id: null,
    });

    const [favorites, setFavorites] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);

    const [country, setCountry] = useState("");
    const [propertiesByCountry, setPropertiesByCountry] = useState([]);
    const [byCountryLastEvaluatedKey, setByCountryLastEvaluatedKey] = useState({
        id: null,
        city: null
    })

    const [loading, setLoading] = useState(false);
    const [originalDataSetLoaded, setOriginalDataSetLoaded] = useState(false);

    const fetchProperties = useCallback(async () => {
        setLoading(true);

        // Throttle
        const now = Date.now();
        if (now - lastFetchTimeRef.current < FETCH_INTERVAL) {
            setLoading(false);
            return;
        }
        lastFetchTimeRef.current = now;

        setPropertiesByCountry([])
        setByCountryLastEvaluatedKey({id: null, city: null})

        try {
            const response = await propertyRepository.fetchAllPropertyTypes(
                lastEvaluatedKey.createdAt,
                lastEvaluatedKey.id,
            );

            setProperties([...properties, ...response.properties]);
            setLastEvaluatedKey(
                response.lastEvaluatedKey ?? {createdAt: null, id: null},
            );

        } catch (error) {
            ToastMessage(error.message, ToastAndroid.SHORT);
        }
        originalDataSetLoaded ? setOriginalDataSetLoaded(true) : null;

        setLoading(false);
    }, [lastEvaluatedKey]);

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

    const fetchFavorites = useCallback(async () => {
        setFavoritesLoading(true);

        const response = await GetWishlist();

        setFavorites(response.AccommodationIDs);
        setFavorites([])
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

    useEffect(() => {
        fetchProperties();
        // fetchFavorites();
    }, []);

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
                <LoadingScreen/>
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

    return (
        <>
            <Header country={country} setCountry={setCountry} loading={loading}
                    onSearchButtonPress={fetchPropertiesByCountry}
                    onCancelButtonPress={fetchProperties}/>
            <HomeTopBarTabs/>
            {loading && originalDataSetLoaded || favoritesLoading ? (
                <LoadingScreen loadingName={'Properties'}/>
            ) : (
                <FlatList
                    data={propertiesByCountry.length > 0 ? propertiesByCountry : properties}
                    renderItem={renderFlatListItem}
                    onEndReached={fetchNextDataSet}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={renderFooter}
                />
            )}
        </>
    );
};

export default HomeScreen;
