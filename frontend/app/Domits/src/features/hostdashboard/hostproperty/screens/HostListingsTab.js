import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../../context/AuthContext';
import {styles} from '../styles/HostPropertiesStyles'
import {HOST_ONBOARDING_SCREEN, PROPERTY_DETAILS_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";
import TabHeader from "../../../../screens/accounthome/components/TabHeader";
import HostPropertyRepository from "../../../../services/property/HostPropertyRepository";
import TranslatedText from "../../../translation/components/TranslatedText";
import {S3URL} from "../../../../store/constants";
import {COLORS} from "../../../../styles/COLORS";
import {useTranslation} from "react-i18next";
import Ionicons from "react-native-vector-icons/Ionicons";

const HostListingsTab = () => {
  const hostPropertyRepository = new HostPropertyRepository();
  const navigation = useNavigation();
  const {userAttributes} = useAuth();
  const userId = userAttributes?.sub;
  const {t} = useTranslation();

  const [properties, setProperties] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProperties().catch(error => console.error('Could not fetch properties upon initialisation.', error));
    }
  }, [userId]);

  const fetchProperties = async () => {
    setIsLoadingProperties(true);
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
      setIsLoadingProperties(false);
    }
  };

  const updatePropertyStatus = async (propertyId) => {
    //todo Check if host is verified and eligible

    try {
      await hostPropertyRepository.updatePropertyStatus(propertyId);
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  }

  const navigateToDetailPage = propertyId => {
    //fixme PropertyDetailsScreen lives on the Home stack while also having usage in Account stack, Details screen for hosts required
    navigation.navigate(PROPERTY_DETAILS_SCREEN, {property: {property: {id: propertyId}}});
  };

  const navigateToAddProperty = () => {
    navigation.navigate(HOST_ONBOARDING_SCREEN);
  };

  const confirmUpdatePropertyStatus = (propertyId) => {
    Alert.alert(t('Confirm Property Status'), t('Are you sure you want to set this property LIVE?'), [
      {
        text: t('Cancel'),
        style: 'cancel',
      },
      {
        text: t('Yes'), onPress: () => {
          updatePropertyStatus(propertyId).then(() => fetchProperties())
        }
      },
    ]);
  }

  return (
    <ScrollView style={{flex: 1}}>
      <View style={styles.contentContainer}>
        <TabHeader tabTitle={'Properties'} />
        <TouchableOpacity onPress={navigateToAddProperty} style={styles.addPropertyButton}>
          <Ionicons name="add" size={22} color="white" />
          <Text style={styles.addPropertyButtonText}>
            <TranslatedText textToTranslate={"Add new property"} />
          </Text>
        </TouchableOpacity>
        <Text style={styles.hostPageHeading}>
          <TranslatedText textToTranslate={"Current listings"} />
        </Text>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {isLoadingProperties ? (
            <ActivityIndicator size="large" color={COLORS.domitsGuestGreen} />
          ) : properties.length > 0 ? (
            properties.map(item => {
              return (
                <TouchableOpacity
                  key={item.property.id}
                  style={styles.propertyItem}
                  onPress={() => navigateToDetailPage(item.property.id)}>
                  <Image
                    source={{uri: `${S3URL}${item.images[0].key}`}}
                    style={styles.propertyImage}
                  />
                  <View style={styles.propertyNameContainer}>
                    <Text style={styles.propertyNameText}>{item.property.title}</Text>
                  </View>

                  <TouchableOpacity onPress={() => {
                    item.property.status === "INACTIVE" ?
                      confirmUpdatePropertyStatus(item.property.id) :
                      Alert.alert(t("Property is already live"));
                  }}>

                    <View style={styles.propertyStatusContainer}>
                      <Text style={styles.propertyStatusText}>
                        {item.property.status}
                      </Text>
                      {item.property.status === "INACTIVE" && (
                        <Ionicons name="cloud-upload-outline" size={22} color="#000" />
                      )}
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noListingsText}>
              <TranslatedText textToTranslate={"You have no properties listed yet"} />
            </Text>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

export default HostListingsTab;
