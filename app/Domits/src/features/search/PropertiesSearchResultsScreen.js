import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import TranslatedText from '../translation/components/TranslatedText';
import {styles} from './styles/PropertiesSearchResultsStyles';
import FetchProperties from './services/fetchProperties';

const PropertiesSearchResultsScreen = () => {
  const [lastEvaluatedKeyCreatedAt, setLastEvaluatedKeyCreatedAt] =
    useState(null);
  const [lastEvaluatedKeyId, setLastEvaluatedKeyId] = useState(null);
  const [accommodationsList, setAccommodationsList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await FetchProperties(
        lastEvaluatedKeyCreatedAt,
        lastEvaluatedKeyId,
      );
      console.log(result);
      setAccommodationsList(result);

      if (result.length > 0) {
        const lastItem = result[result.length - 1];
        setLastEvaluatedKeyCreatedAt(lastItem.property.createdAt);
        setLastEvaluatedKeyId(lastItem.property.id);
      }

      setLoading(false);
    }

    if (!accommodationsList) {
      loadData();
    }
  }, [accommodationsList, lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  /**
   * Go to the details page of the pressed accommodation
   * @param accommodation - The accommodation pressed on
   */
  const handleAccommodationPress = accommodation => {
    navigation.navigate('Detailpage', {accommodation});
  };

  /**
   * Render a Text component for accommodation specifications
   * @param value - Specification value to be displayed
   * @param suffix - Optional string to appended
   * @returns {JSX.Element|null} - A text component or null if the value is undefined
   */
  const renderSpecText = (value, suffix = '') => {
    return value !== undefined ? (
      <Text style={styles.spec}>
        {value} {suffix}
      </Text>
    ) : null;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {accommodationsList.map(accommodation => (
        <TouchableOpacity
          style={[styles.card, containerWidth ? {width: containerWidth} : null]}
          key={accommodation.property.id}
          onPress={() => handleAccommodationPress(accommodation)}>
          <Image
            source={{
              uri: `https://accommodation.s3.eu-north-1.amazonaws.com/${accommodation.propertyImages[0].key}`,
            }}
            style={styles.image}
            onLayout={event => {
              const {width} = event.nativeEvent.layout;
              setContainerWidth(width);
            }}
          />
          <View style={styles.cardContent}>
            <Text style={styles.price}>
              €{accommodation.propertyPricing.roomRate}{' '}
              <TranslatedText textToTranslate={'per night'} />
            </Text>
            <Text style={styles.details} numberOfLines={3}>
              {accommodation.property.description}
            </Text>
            <View style={styles.specs}>
              {accommodation.propertyGeneralDetails.map(detail => {
                {
                  renderSpecText(
                    detail.value,
                    <TranslatedText textToTranslate={detail.detail} />,
                  );
                }
              })}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default PropertiesSearchResultsScreen;
