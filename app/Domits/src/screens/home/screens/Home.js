import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Text, View} from 'react-native';

import PropertyCard from '../views/PropertyCard';
import Header from '../../../header/header';

import FetchAllPropertyTypes from '../../../services/FetchAllPropertyTypes';
import GetWishlist from "../../../services/wishlist/GetWishlist";
import addToWishlist from "../../../services/wishlist/AddToWishlist";
import RemoveFromWishlist from "../../../services/wishlist/RemoveFromWishlist";

const HomeScreen = () => {
    const [properties, setProperties] = useState([]);

    const [lastEvaluatedKey, setLastEvaluatedKey] = useState({
        createdAt: null,
        id: null,
    });

    const [favorites, setFavorites] = useState([]);

    const [loading, setLoading] = useState(false);
    const [favoritesLoading, setFavoritesLoading] = useState(false);

    const [firstDataSetLoaded, setFirstDataSetLoaded] = useState(false);

    const fetchProperties = useCallback(async () => {
        setLoading(true);

        const response = await FetchAllPropertyTypes(
            lastEvaluatedKey.createdAt,
            lastEvaluatedKey.id,
        );

        setProperties(response.properties);
        setLastEvaluatedKey(
            response.lastEvaluatedKey ?? {createdAt: null, id: null},
        );

        setFirstDataSetLoaded(true);
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
        if (!lastEvaluatedKey.createdAt && !lastEvaluatedKey.id) {
            return (
                <View style={{padding: 16, alignItems: 'center'}}>
                    <Text style={{color: '#666'}}>
                        No more active properties available.
                    </Text>
                </View>
            );
        } else {
            <ActivityIndicator size="large"/>;
        }
    };

    return (
        <>
            <Header/>
            {!firstDataSetLoaded && loading || favoritesLoading ? (
                <ActivityIndicator size="small"/>
            ) : (
                <FlatList
                    data={properties}
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
