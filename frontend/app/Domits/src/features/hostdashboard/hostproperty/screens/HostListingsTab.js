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
import {S3URL} from "../../../../store/constants";

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
    {/*fixme PropertyDetailsScreen lives on the Home stack while also having usage in Account stack, Details screen for hosts required*/}
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
                return (
                  <TouchableOpacity
                    key={item.property.id}
                    style={styles.accommodationItem}
                    onPress={() => navigateToDetailPage(item.property.id)}>
                    <Image
                      source={{uri: `${S3URL}${item.images[0].key}`}}
                      style={styles.accommodationImage}
                    />
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
