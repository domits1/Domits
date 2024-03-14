import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Detailpage = ({ navigation }) => {
  const images = [
    require('./pictures/detailPhoto.jpg'),
    require('./pictures/detailPhoto2.jpg'),
    require('./pictures/detailPhoto3.jpg'),
    require('./pictures/detailPhoto4.jpg'),
    require('./pictures/detailPhoto5.jpg'),
  ];

  const [currentPage, setCurrentPage] = useState(0);

  const handleHomeScreenPress = () => {
    navigation.navigate('HomeScreen');
  };
  const handleMessagesPress = () => {
    navigation.navigate('Messages');
  };
  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };
  const handleonBoarding1Press = () => {
    navigation.navigate('onBoarding1');
  };

  const handleScroll = (event) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
    setCurrentPage(page);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleHomeScreenPress}>
          <AntDesign
            name="leftcircleo"
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

      <ScrollView style={{ flex: 1 }}>
        <ScrollView
          horizontal={true}
          contentContainerStyle={styles.imageContainer}
          pagingEnabled={true}
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          {images.map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={image} style={styles.image} />
              
            </View>
          ))}
        </ScrollView>
        <View style={styles.counterContainer}>
                <Text style={styles.counterText}>{currentPage + 1}/{images.length}</Text>
              </View>

        <View>
          <Text style={styles.text}>
            Minimalistic and cozy apartment in Haarlem
          </Text>
          <Text style={styles.additionalText}>
            The perfect getaway for 2 people in Haarlem to relax with 100% cozy
            vibes!
          </Text>
        </View>

        <View style={styles.borderContainer}>
          <View style={styles.bedroomsContainer}>
            <Text style={styles.bedroomsText}>2 bedrooms</Text>
          </View>
          <View style={styles.bathroomsContainer}>
            <Text style={styles.bathroomsText}>2 bathrooms</Text>
          </View>
        </View>

        <View style={styles.newBorderContainer}>
          <View style={styles.newBedroomsContainer}>
            <Text style={styles.newBedroomsText}>125m²</Text>
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
            <Text style={styles.nameText}>Huub Homer</Text>
          </View>
          <View style={styles.rightHostInfo}>
            <View style={styles.hostRatingContainer}>
              <Text style={styles.hostRatingText}>
                Huub Homer has an average star rating of 4.4{' '}
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
    padding: 0,
    flexDirection: 'row',
  },
  // marginRight 32 for more spacing between pics
  imageWrapper: {
    position: 'relative',
    marginRight: 0,
  },
  //resolution 360 to bring back old slide
  image: {
    width: 393,
    height: 250,
    borderRadius: 15,
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
    marginLeft: 8,
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
    borderColor: '#f0f0f0',
    borderRadius: 25,
    padding: 10,
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
    fontSize: 12,
    textAlign: 'center',

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
    marginBottom: 5, // this is for test so that i can scroll up and down (can be removed later)
    alignSelf: 'center',
    width: 330,
  },

  verifiedHostText: {
    marginLeft: 20,
    color: 'black',
    fontSize: 16,
    fontFamily: 'MotivaSansBold.woff',
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
    top: 220,
    right: 0,
    width: 50,
    height: 30,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.0)',
    borderTopLeftRadius: 15, 
    borderBottomRightRadius: 15, 
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'MotivaSansRegular.woff',
    marginLeft: 0,
  },
});

export default Detailpage;
