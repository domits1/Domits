import {useCallback, useEffect, useState} from 'react';

import FetchAllPropertyTypes from '../../../services/FetchAllPropertyTypes';

import {ActivityIndicator, FlatList, Text, View} from 'react-native';

import PropertyCard from '../views/PropertyCard';

import Header from '../../../header/header';

const HomeScreen = () => {
  const [properties, setProperties] = useState([]);

  const [lastEvaluatedKey, setLastEvaluatedKey] = useState({
    createdAt: null,

    id: null,
  });

  const [loading, setLoading] = useState(false);

  const [firstDataSetLoaded, setFirstDataSetLoaded] = useState(false);

  const fetchData = useCallback(async () => {
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchNextDataSet = () => {
    if (lastEvaluatedKey.createdAt && lastEvaluatedKey.id) {
      fetchData();
    }
  };

  const renderFlatListItem = ({item}) => {
    return <PropertyCard property={item} />;
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
      <ActivityIndicator size="large" />;
    }
  };

  return (
    <>
      <Header />
      {!firstDataSetLoaded && loading ? (
        <ActivityIndicator size="small" />
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
