import React, {useEffect, useState} from 'react';
import {Image, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../../context/AuthContext';
import {styles} from '../styles/HostPropertiesStyles'
import LoadingScreen from "../../../../screens/loadingscreen/screens/LoadingScreen";
import {HOST_ONBOARDING_SCREEN, PROPERTY_DETAILS_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";
import TabHeader from "../../../../screens/accounthome/components/TabHeader";
import HostPropertyRepository from "../../../../services/property/HostPropertyRepository";
import TranslatedText from "../../../translation/components/TranslatedText";

const HostListingsTab = () => {
  const hostPropertyRepository = new HostPropertyRepository();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const {userAttributes} = useAuth();
  const userId = userAttributes?.sub;

  useEffect(() => {
    if (userId) {
      fetchProperties().catch(error => console.error('Could not fetch properties upon initialisation.', error));
    }
  }, [userId]);

  const fetchProperties = async () => {
    setIsLoading(true);
    if (!userId) {
      console.error('No user id provided.');
      return;
    }
    try {
      const data = await hostPropertyRepository.fetchAllHostProperties()
      setProperties(data)
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToDetailPage = propertyId => {
    navigation.navigate(PROPERTY_DETAILS_SCREEN, {property: {property: {id: propertyId}}});
  };

  const addProperty = () => {
    navigation.navigate(HOST_ONBOARDING_SCREEN);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <TabHeader tabTitle={'Properties'}/>
        <TouchableOpacity onPress={addProperty} style={styles.listItem}>
          <Text style={styles.listItemText}>
            <TranslatedText textToTranslate={"Add new property"}/>
          </Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.boxColumns}>
          <View style={styles.box}>
            <Text style={styles.boxText}>
              <TranslatedText textToTranslate={"Current listings"}/>
            </Text>
            {isLoading ? (
              <LoadingScreen/>
            ) : properties.length > 0 ? (
              properties.map(item => {
                const imageUrls = item.Images ? Object.values(item.Images) : [];
                if (imageUrls.length > 1) {
                  const mainImage = imageUrls.splice(
                    imageUrls.length - 2,
                    1,
                  )[0];
                  imageUrls.unshift(mainImage);
                }
                const primaryImageUrl =
                  imageUrls.length > 0 ? imageUrls[0] : null;
                return (
                  <TouchableOpacity
                    key={item.property.id}
                    style={styles.accommodationItem}
                    onPress={() => navigateToDetailPage(item.property.id)}>
                    {primaryImageUrl && (
                      <Image
                        source={{uri: primaryImageUrl}}
                        style={styles.accommodationImage}
                      />
                    )}
                    <View style={styles.accommodationText}>
                      <Text style={styles.accommodationName}>{item.property.title}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noListingsText}>
                <TranslatedText textToTranslate={"You have no properties listed yet"}/>
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HostListingsTab;
