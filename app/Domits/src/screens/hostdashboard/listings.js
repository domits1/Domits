import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const Listings = () => {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const { userAttributes } = useAuth();
  const userId = userAttributes?.sub;

  useEffect(() => {
    if (userId) {
      fetchAccommodations();
    }
  }, [userId]);

  const fetchAccommodations = async () => {
    setIsLoading(true);
    if (!userId) {
      console.log("No user id");
      return;
    }
    try {
      const response = await fetch('https://kd929sivhg.execute-api.eu-north-1.amazonaws.com/default/FetchAccommodation', {
        method: 'POST',
        body: JSON.stringify({ OwnerId: userId }),
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      if (data.body && typeof data.body === 'string') {
        const accommodationsArray = JSON.parse(data.body);
        if (Array.isArray(accommodationsArray)) {
          setAccommodations(accommodationsArray);
        } else {
          console.error("Parsed data is not an array:", accommodationsArray);
          setAccommodations([]);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const asyncDeleteAccommodation = async (accommodation) => {
    Alert.alert(
        "Confirm Delete",
        "Are you sure you want to remove this item from your listing?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "OK",
            onPress: async () => {
              const accId = accommodation.ID;
              const accImages = accommodation.Images;
              const options = { id: accId, images: accImages };
              setIsLoading(true);
              try {
                const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/DeleteAccommodation', {
                  method: 'DELETE',
                  body: JSON.stringify(options),
                  headers: { 'Content-type': 'application/json; charset=UTF-8' },
                });
                if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
                }
                setAccommodations(prevAccommodations => prevAccommodations.filter(item => item.ID !== accId));
                Alert.alert('Success', 'This item has been successfully removed from your listing!');
              } catch (error) {
                console.error(error);
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
        { cancelable: true }
    );
  };

  const navigateToDetailPage = (accommodation) => {
    navigation.navigate('HostDetailPage', { accommodation });
  };

  const addAccommodation = () => {
    navigation.navigate('ListProperty');
  };

  return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Listings</Text>
          </View>
          <TouchableOpacity onPress={addAccommodation} style={styles.listItem}>
            <Text style={styles.listItemText}>Add new accommodation</Text>
            <MaterialIcons name="chevron-right" size={22} color="#000" />
          </TouchableOpacity>
          <View style={styles.boxColumns}>
            <View style={styles.box}>
              <Text style={styles.boxText}>Current Listings</Text>
              {isLoading ? (
                  <ActivityIndicator size="large" color="#003366" />
              ) : accommodations.length > 0 ? (
                  accommodations.map((item) => {
                    const imageUrls = item.Images ? Object.values(item.Images) : [];
                    if (imageUrls.length > 1) {
                      const mainImage = imageUrls.splice(imageUrls.length - 2, 1)[0];
                      imageUrls.unshift(mainImage);
                    }
                    const primaryImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
                    return (
                        <TouchableOpacity key={item.ID} style={styles.accommodationItem} onPress={() => navigateToDetailPage(item)}>
                          {primaryImageUrl && (
                              <Image
                                  source={{ uri: primaryImageUrl }}
                                  style={styles.accommodationImage}
                              />
                          )}
                          <View style={styles.accommodationText}>
                            <Text style={styles.accommodationName}>{item.Title}</Text>
                          </View>
                          <TouchableOpacity onPress={() => asyncDeleteAccommodation(item)}>
                            <MaterialIcons name="delete" size={22} color="red" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                    );
                  })
              ) : (
                  <Text style={styles.noListingsText}>It appears that you have not listed any accommodations yet...</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 30,
    marginTop: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  boxColumns: {
    margin: 10,
    flexDirection: 'column',
  },
  box: {
    elevation: 1,
    shadowColor: '#003366',
    padding: 10,
    margin: 10,
    minHeight: 150,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#003366',
  },
  boxText: {
    borderWidth: 1,
    borderColor: '#003366',
    borderRadius: 15,
    padding: 5,
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#003366',
    borderRadius: 10,
    margin: 20,
    marginBottom: 0,
    marginTop: 30,
  },
  listItemText: {
    fontSize: 18,
  },
  accommodationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  accommodationImage: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 10,
  },
  accommodationText: {
    flex: 1,
  },
  accommodationName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noListingsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#777',
  },
});

export default Listings;
