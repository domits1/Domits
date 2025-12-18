import React, {useEffect, useState} from 'react';
import {Alert, Image, ScrollView, Text, TouchableOpacity, View,} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../../../context/AuthContext';
import {styles} from '../styles/HostPropertiesStyles'
import LoadingScreen from "../../../../screens/loadingscreen/screens/LoadingScreen";
import {HOST_ONBOARDING_SCREEN, PROPERTY_DETAILS_SCREEN} from "../../../../navigation/utils/NavigationNameConstants";
import TabHeader from "../../../../screens/accounthome/components/TabHeader";

const HostListingsTab = () => {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const {userAttributes} = useAuth();
  const userId = userAttributes?.sub;

  useEffect(() => {
    if (userId) {
      fetchAccommodations();
    }
  }, [userId]);

  const fetchAccommodations = async () => {
    setIsLoading(true);
    if (!userId) {
      console.log('No user id');
      return;
    }
    try {
      const response = await fetch(
        'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation',
        {
          method: 'POST',
          body: JSON.stringify({OwnerId: userId}),
          headers: {'Content-type': 'application/json; charset=UTF-8'},
        },
      );
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      if (data.body && typeof data.body === 'string') {
        const accommodationsArray = JSON.parse(data.body);
        if (Array.isArray(accommodationsArray)) {
          setAccommodations(accommodationsArray);
        } else {
          console.error('Parsed data is not an array:', accommodationsArray);
          setAccommodations([]);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const asyncDeleteAccommodation = async accommodation => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this item from your listing?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            const accId = accommodation.ID;
            const accImages = accommodation.Images;
            const options = {id: accId, images: accImages};
            setIsLoading(true);
            try {
              const response = await fetch(
                'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/DeleteAccommodation',
                {
                  method: 'DELETE',
                  body: JSON.stringify(options),
                  headers: {'Content-type': 'application/json; charset=UTF-8'},
                },
              );
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
              setAccommodations(prevAccommodations =>
                prevAccommodations.filter(item => item.ID !== accId),
              );
              Alert.alert(
                'Success',
                'This item has been successfully removed from your listing!',
              );
            } catch (error) {
              console.error(error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  const navigateToDetailPage = accommodationId => {
    navigation.navigate(PROPERTY_DETAILS_SCREEN, {accommodation: accommodationId});
  };

  const addProperty = () => {
    navigation.navigate(HOST_ONBOARDING_SCREEN);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <ScrollView style={styles.container}>
        <TabHeader tabTitle={'Properties'}/>
        <TouchableOpacity onPress={addProperty} style={styles.listItem}>
          <Text style={styles.listItemText}>Add new accommodation</Text>
          <MaterialIcons name="chevron-right" size={22} color="#000" />
        </TouchableOpacity>
        <View style={styles.boxColumns}>
          <View style={styles.box}>
            <Text style={styles.boxText}>Current Listings</Text>
            {isLoading ? (
              <LoadingScreen/>
            ) : accommodations.length > 0 ? (
              accommodations.map(item => {
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
                    key={item.ID}
                    style={styles.accommodationItem}
                    onPress={() => navigateToDetailPage(item.ID)}>
                    {primaryImageUrl && (
                      <Image
                        source={{uri: primaryImageUrl}}
                        style={styles.accommodationImage}
                      />
                    )}
                    <View style={styles.accommodationText}>
                      <Text style={styles.accommodationName}>{item.Title}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => asyncDeleteAccommodation(item)}>
                      <MaterialIcons name="delete" size={22} color="red" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noListingsText}>
                It appears that you have not listed any accommodations yet...
              </Text>
            )}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxText}>Pending</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HostListingsTab;
