import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CommonActions} from '@react-navigation/native';

const Detailpage = ({route, navigation}) => {
  const id = route.params.accommodation.id;
  const [accommodation, setAccommodation] = useState([]);
  const [parsedAccommodation, setParsedAccommodation] = useState({});
  const [owner, setOwner] = useState();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [images, setImages] = useState([]);

  useEffect(() => {
    console.log('ID:', id);
  }, [id]);

  useEffect(() => {
    const fetchAccommodation = async () => {
      try {
        const response = await fetch(
          'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ID: id}),
          },
        );
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const responseData = await response.json();
        setAccommodation(responseData);

        const parsedBody =
          typeof responseData.body === 'string'
            ? JSON.parse(responseData.body)
            : responseData.body;
        setParsedAccommodation(parsedBody);
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAccommodation();
  }, [id]);

  useEffect(() => {
    const fetchOwner = async () => {
      const ownerId = parsedAccommodation.OwnerId;
      try {
        const response = await fetch(
          'https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({OwnerId: ownerId}),
          },
        );
        if (!response.ok) {
          throw new Error('Failed to fetch owner data');
        }
        const responseData = await response.json();
        const data = responseData.body ? JSON.parse(responseData.body) : null;
        if (!data) {
          console.error('No data found in response body');
          return;
        }
        // Access the first element of the array and check if it has Attributes
        if (data.length > 0 && data[0].Attributes) {
          const attributes = data[0].Attributes; // Access Attributes correctly
          attributes.forEach((attr, index) => {
            console.log(`Attribute ${index + 1}:`, attr);
          });
        } else {
          console.error('Attributes data is missing or malformed');
        }

        const attributesObject = data[0].Attributes.reduce((acc, attr) => {
          acc[attr.Name] = attr.Value;
          return acc;
        }, {});

        console.log('Attributes object:', attributesObject);
        setOwner(
          attributesObject.given_name + ' ' + attributesObject.family_name ||
            'Unknown Host',
        );
      } catch (error) {
        console.error('Error fetching owner data:', error);
      }
    };
    fetchOwner();
  }, [parsedAccommodation]);

  useEffect(() => {
    console.log('Owner:', owner);
  }, [owner]);

  useEffect(() => {
    if (parsedAccommodation.Images) {
      const originalImages = parsedAccommodation.Images;

      const updatedImages = Object.entries(originalImages)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, url]) => {
          const updatedUrl = url.replace('detail', 'mobile');
          return {uri: updatedUrl};
        });
      setImages(updatedImages);
    } else {
      console.warn('No Images object found in parsed accommodation data.');
    }
  }, [id, accommodation, parsedAccommodation]);

  const [currentPage, setCurrentPage] = useState(0);

  const handleHomeScreenPress = () => {
    navigation.navigate('HomeScreen');
  };

  const handleMessagesPress = () => {
    const email = 'user1@example.com';
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'Messages', params: {email}}],
      }),
    );
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };
  const handleonBoarding1Press = () => {
    navigation.navigate('onBoarding1');
  };

  const handleScroll = event => {
    const page = Math.round(
      event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width,
    );
    setCurrentPage(page);
  };

  // Dynamically calculate image width based on screen width
  const imageWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleHomeScreenPress}>
            <Ionicons
              name="chevron-back-outline"
              size={24}
              color="black"
              style={styles.icon}
            />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <TouchableOpacity onPress={handleMessagesPress}>
              <FeatherIcon
                name="message-square"
                size={24}
                color="black"
                style={styles.icon1}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSettingsPress}>
              <FeatherIcon
                name="settings"
                size={24}
                color="black"
                style={styles.icon2}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{flex: 1}}>
          <ScrollView
            horizontal={true}
            contentContainerStyle={styles.imageContainer}
            pagingEnabled={true}
            onScroll={handleScroll}
            scrollEventThrottle={100}>
            {Object.entries(images).map(([key, url]) => (
              <View key={key} style={styles.imageWrapper}>
                <Image
                  source={url}
                  style={[styles.image, {width: imageWidth}]}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentPage + 1}/{images.length}
            </Text>
          </View>

          <View>
            <Text style={styles.text}>{parsedAccommodation.Title}</Text>
            <Text style={styles.additionalText}>
              {parsedAccommodation.Subtitle}
            </Text>
          </View>

          <View style={styles.borderContainer}>
            <View style={styles.bedroomsContainer}>
              <Text style={styles.bedroomsText}>
                {parsedAccommodation.bedrooms || 0} bedrooms
              </Text>
            </View>
            <View style={styles.bathroomsContainer}>
              <Text style={styles.bathroomsText}>
                {parsedAccommodation.Bathrooms} bathrooms
              </Text>
            </View>
          </View>
          <View style={styles.newBorderContainer}>
            <View style={styles.newBedroomsContainer}>
              <Text style={styles.newBedroomsText}>
                {parsedAccommodation.Length}m²
              </Text>
            </View>
            <View style={styles.newBathroomsContainer}>
              <Text style={styles.newBathroomsText}>Over 120+ bookings</Text>
            </View>
            <TouchableOpacity onPress={handleonBoarding1Press}>
              <View style={styles.book}>
                <Text style={styles.bookText2}>Book {'>'} </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.horizontalLine} />

          <Text style={styles.verifiedHostText}>Verified Host</Text>

          <View style={styles.hostInfoContainer}>
            <View style={styles.namebutton}>
              <Text style={styles.nameText}>{owner}</Text>
            </View>
            <View style={styles.rightHostInfo}>
              <View style={styles.hostRatingContainer}>
                <Text style={styles.hostRatingText}>
                  {owner} has an average star rating of 4.4{' '}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.horizontalLine1} />

          <Text style={styles.verifiedHostText}>Amenities</Text>

          <View style={styles.bothAmenities}>
            <View style={styles.amenities}>
              <View style={styles.iconItem}>
                <FontAwesomeIcon
                  name="tv"
                  size={24}
                  color="black"
                  style={styles.iconamenities}
                />
                <Text style={styles.bedroomsText}>Smart TV</Text>
              </View>

              <View style={styles.iconItem}>
                <FeatherIcon
                  name="gift"
                  size={24}
                  color="black"
                  style={styles.iconamenities}
                />
                <Text style={styles.bedroomsText}>Welcome Gift</Text>
              </View>

              <View style={styles.iconItem}>
                <MaterialCommunityIcons
                  name="lightning-bolt-outline"
                  size={24}
                  color="black"
                  style={styles.iconamenities}
                />
                <Text style={styles.bedroomsText}>Super fast Internet</Text>
              </View>

              <View style={styles.iconItem}>
                <Ionicons
                  name="telescope-outline"
                  size={24}
                  color="black"
                  style={styles.iconamenities}
                />
                <Text style={styles.bedroomsText}>Telescope</Text>
              </View>
            </View>

            {/*  (Dit is tijdelijk)*/}
            <View style={styles.amenities}>
              <View style={styles.iconItem}>
                <MaterialCommunityIcons
                  name="sun-thermometer-outline"
                  size={24}
                  color="black"
                  style={styles.iconamenities}
                />

                <Text style={styles.bedroomsText}>Sauna</Text>
              </View>

              <View style={styles.iconItem}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={24}
                  color="black"
                  style={styles.iconamenities}
                />
                <Text style={styles.bedroomsText}>Dimmable lights</Text>
              </View>

              <View style={styles.iconItem}>
                <FontAwesomeIcon
                  name="diamond"
                  size={20}
                  color="black"
                  style={styles.iconamenities}
                />
                <Text style={styles.bedroomsText}>Vault</Text>
              </View>
            </View>
          </View>
          <View style={styles.horizontalLine1} />

          <Text style={styles.verifiedHostText}>In the Area:</Text>

          <View style={styles.imageAndTextContainer}>
            <View style={styles.imageWrapper}>
              <Image
                source={require('./pictures/goaty.png')}
                style={styles.goaty}
              />
            </View>

            <View style={styles.randomTextWrapper}>
              <Text style={styles.randomText}>
                Goat milkig at Timo’s farm in Haarlem
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    flexDirection: 'row',
  },
  bothAmenities: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 25,
  },
  amenities: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginLeft: 5,
    marginBottom: 10,
  },
  iconItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconamenities: {
    marginRight: 10,
  },
  icon: {
    marginHorizontal: 1,
  },
  icon1: {
    marginHorizontal: 10,
  },
  icon2: {
    marginLeft: 20,
  },
  text: {
    color: 'black',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'MotivaSansBold.woff',
  },
  additionalText: {
    color: 'black',
    fontSize: 16,
    padding: 0,
    marginTop: 5,
    marginLeft: 17,
    fontFamily: 'MotivaSansRegular.woff',
  },
  //padding for so that image wont touch phone wall
  imageContainer: {
    flexDirection: 'row',
  },
  // marginRight 32 for more spacing between pics
  imageWrapper: {
    position: 'relative',
  },
  //resolution 360 to bring back old slide
  image: {
    height: 250,
  },
  borderContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  bedroomsContainer: {
    width: 100,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    padding: 10,
    marginRight: 10,
    marginLeft: 17,
    height: 40,
  },
  bathroomsContainer: {
    width: 100,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 10,
    padding: 10,
    marginLeft: 10,
    height: 40,
  },
  bedroomsText: {
    color: 'black',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
  },
  bathroomsText: {
    color: 'black',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
  },
  bathroomsText2: {
    color: 'black',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
  },
  newBorderContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  newBedroomsContainer: {
    width: 70,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    padding: 10,
    marginRight: 0,
    marginLeft: 17,
    height: 35,
  },
  newBathroomsContainer: {
    width: 150,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    padding: 10,
    marginLeft: 10,
    marginRight: 8,
    height: 38,
  },
  book: {
    width: 80,
    borderWidth: 2,
    borderColor: 'green',
    borderRadius: 25,
    padding: 8,
    marginLeft: 45,
    height: 37,
    backgroundColor: 'green',
  },
  newBedroomsText: {
    color: 'black',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
  },
  newBathroomsText: {
    color: 'black',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
  },
  bookText2: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    marginLeft: 5,

    fontFamily: 'MotivaSansRegular.woff',
  },
  horizontalLine: {
    height: 1,
    backgroundColor: 'black',
    marginVertical: 25,
    marginBottom: 0,
    alignSelf: 'center',
    width: 330,
  },
  horizontalLine1: {
    height: 1,
    backgroundColor: 'black',
    marginVertical: -10,
    marginBottom: 5,
    alignSelf: 'center',
    width: 330,
  },
  namebutton: {
    width: 110,
    borderWidth: 1,
    borderColor: 'green',
    borderRadius: 12,
    padding: 10,
    marginRight: 0,
    marginLeft: 17,
    height: 38,
    marginBottom: 50,
  },
  nameText: {
    color: 'black',
    fontSize: 12,
    fontFamily: 'MotivaSansBold.woff',
    textAlign: 'center',
  },
  verifiedHostText: {
    marginLeft: 20,
    color: 'black',
    fontSize: 16,
    fontFamily: 'MotivaSansBold.woff',
    marginVertical: 20,
  },
  hostInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  hostRatingContainer: {
    width: 230,
    padding: 10,
    marginLeft: 10,
  },
  hostRatingText: {
    color: 'black',
    marginBottom: 30,
    fontSize: 12.5,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
  },
  goaty: {
    width: 150,
    height: 150,
    borderRadius: 15,
  },
  imageAndTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 25,
    marginBottom: 20,
  },
  randomTextWrapper: {
    flex: 1,
    marginLeft: 20,
  },
  randomText: {
    fontSize: 12,
    color: 'black',
    fontFamily: 'MotivaSansRegular.woff',
  },
  counterContainer: {
    position: 'absolute',
    top: 208,
    right: 12,
    width: 50,
    height: 30,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.0)',
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'MotivaSansRegular.woff',
    marginLeft: 2,
  },
});

export default Detailpage;
