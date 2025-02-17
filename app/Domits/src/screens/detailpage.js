import React, {useEffect, useState} from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import featureIcons from '../ui-components/FeatureIcons'

const Detailpage = ({route, navigation}) => {
  const id = route.params.accommodation.id;
  const [accommodation, setAccommodation] = useState([]);
  const [parsedAccommodation, setParsedAccommodation] = useState({});
  const [owner, setOwner] = useState();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [images, setImages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  useEffect(() => {
    const fetchAccommodation = async () => {
      try {
        const response = await fetch(
          'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation',
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
      if (!ownerId) {
        return;
      }
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

        const attributesObject = data[0].Attributes.reduce((acc, attr) => {
          acc[attr.Name] = attr.Value;
          return acc;
        }, {});
        setOwner(
          attributesObject.given_name + ' ' + attributesObject.family_name ||
            'Unknown Host',
        );
      } catch (error) {
        console.error('Error fetching owner data:', error);
      }
    };
    fetchOwner();
  }, [id, parsedAccommodation]);

  useEffect(() => {
    if (parsedAccommodation && parsedAccommodation.Images) {
      const originalImages = parsedAccommodation.Images;

      const updatedImages = Object.entries(originalImages)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, url]) => {
          const updatedUrl = url.replace('detail', 'mobile');
          return {uri: updatedUrl};
        });
      setImages(updatedImages);
    } else if (!loading) {
      console.warn('No Images object found in parsed accommodation data.');
    }
  }, [parsedAccommodation, loading]);

  const [currentPage, setCurrentPage] = useState(0);

  const handleHomeScreenPress = () => {
    navigation.navigate('HomeScreen');
  };

  const handleonBoarding1Press = () => {
  //TODO Remove ToastAndroid message after working booking system
    ToastAndroid.show("Sorry, we currently do not accept bookings.", ToastAndroid.SHORT)
//    navigation.navigate('onBoarding1', {
//      accommodation,
//      parsedAccommodation,
//      images,
//    });
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

  const toggleModal = () => {
    setShowModal(!showModal);
  };

  const renderAmenities = () => {
    const allAmenities = parsedAccommodation.Features || {};
    const categoriesToShow = Object.keys(allAmenities)
      .filter(category => allAmenities[category].length > 0)
      .slice(0, 3);

    return categoriesToShow.map((category, categoryIndex) => {
      const items = allAmenities[category].slice(0, 5);

      return (
        <View key={categoryIndex} style={styles.featuresCategory}>
          <Text style={styles.categoryTitle}>{category}</Text>
          <View style={styles.divider} />

          {items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.iconItem}>
              {featureIcons[item] ? (
                <View style={styles.featureIcon}>{featureIcons[item]}</View>
              ) : null}
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    });
  };

  const FeaturePopup = ({features, onClose}) => {
    return (
      <Modal transparent={true} visible={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✖</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              What does this place have to offer?
            </Text>
            <ScrollView>
              {Object.keys(features).map(category => {
                const categoryItems = features[category];
                if (categoryItems.length > 0) {
                  return (
                    <View key={category} style={styles.featuresCategory}>
                      <Text style={styles.categoryTitle}>{category}</Text>
                      <View style={styles.divider} />
                      {categoryItems.map((item, index) => (
                        <View key={index} style={styles.categoryItem}>
                          {typeof featureIcons[item] === 'string' ? (
                            <Image
                              source={{uri: featureIcons[item]}}
                              style={styles.featureIcon}
                            />
                          ) : featureIcons[item] ? (
                            <View style={styles.featureIcon}>
                              {featureIcons[item]}
                            </View>
                          ) : null}
                          <Text style={styles.featureText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  );
                }
                return null;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDateRange = () => {
    const dateRanges = parsedAccommodation.DateRanges || [];

    if (dateRanges.length === 0) {
      return null;
    }

    const sortedRanges = dateRanges.sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate),
    );

    const earliestDate = new Date(sortedRanges[0].startDate);
    const latestDate = new Date(sortedRanges[sortedRanges.length - 1].endDate);

    const formatDate = date => {
      const day = date.toLocaleDateString('en-US', {
        day: 'numeric',
        timeZone: 'UTC',
      });
      const month = date.toLocaleDateString('en-US', {
        month: 'long',
        timeZone: 'UTC',
      });
      return `${day} ${month}`;
    };

    return (
      <View>
        <Text>
          {formatDate(earliestDate)} - {formatDate(latestDate)}
        </Text>
      </View>
    );
  };

  const renderDotIndicator = () => {
    return (
      <View style={styles.dotContainer}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentPage === index ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <View>
          <Text style={styles.text}>{parsedAccommodation.Title}</Text>
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
                  source={{uri: url.uri}}
                  style={[styles.image, {width: imageWidth}]}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.counterContainer}>{renderDotIndicator()}</View>

          <View>
            <Text style={styles.additionalText}>
              {parsedAccommodation.Subtitle}
            </Text>
          </View>
          <View>
            <Text>€{parsedAccommodation.Rent} per night</Text>
          </View>
          <View>
            <Text>{renderDateRange()}</Text>
          </View>
          <View style={styles.borderContainer}>
            <View style={styles.bedroomsContainer}>
              <Text style={styles.bedroomsText}>
                {parsedAccommodation.GuestAmount} guests
              </Text>
            </View>
            <View style={styles.bathroomsContainer}>
              <Text style={styles.bedroomsText}>
                {parsedAccommodation.bedrooms || 0} bedrooms
              </Text>
            </View>
          </View>
          <View style={styles.newBorderContainer}>
            <View style={styles.newBedroomsContainer}>
              <Text style={styles.newBedroomsText}>
                {parsedAccommodation.Beds} beds
              </Text>
            </View>
            <View style={styles.newBathroomsContainer}>
              <Text style={styles.bathroomsText}>
                {parsedAccommodation.Bathrooms} bathrooms
              </Text>
            </View>
            <TouchableOpacity onPress={handleonBoarding1Press}>
              <View style={styles.book}>
                <Text style={styles.bookText2}>Book {'>'} </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              {parsedAccommodation.Description}
            </Text>
          </View>
          <View style={styles.horizontalLine} />
          <Text style={styles.verifiedHostText}>Amenities</Text>
          <View style={styles.amenities}>{renderAmenities()}</View>
          <View>
            <TouchableOpacity
              onPress={toggleModal}
              style={styles.showMoreButton}>
              <Text style={styles.showMoreText}>Show more</Text>
            </TouchableOpacity>
            {showModal && (
              <FeaturePopup
                features={parsedAccommodation.Features}
                onClose={toggleModal}
              />
            )}
          </View>
          <View style={styles.horizontalLine1} />
          <Text style={styles.verifiedHostText}>Hosted by</Text>
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
    marginVertical: 10,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  featuresCategory: {
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  divider: {
    height: 1,
    backgroundColor: 'lightgray',
    marginVertical: 5,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  featureIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: 'black',
  },
  showMoreText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 22,
    textAlign: 'center',
  },
  showMoreButton: {
    width: 120,
    borderWidth: 2,
    borderColor: 'green',
    borderRadius: 25,
    padding: 8,
    marginLeft: 45,
    height: 37,
    backgroundColor: 'green',
    alignSelf: 'center',
  },
  showMoreAmenitiesText: {
    marginLeft: 20,
    color: 'black',
    fontFamily: 'MotivaSansBold.woff',
    marginVertical: 5,
    alignSelf: 'center',
  },
  descriptionContainer: {
    marginVertical: 10,
  },
  descriptionText: {
    color: 'black',
    fontSize: 14,
    fontFamily: 'MotivaSansRegular.woff',
    marginVertical: 10,
    marginLeft: 17,
  },
  dotContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: 'green',
  },
  inactiveDot: {
    backgroundColor: 'gray',
  },
});

export default Detailpage;
