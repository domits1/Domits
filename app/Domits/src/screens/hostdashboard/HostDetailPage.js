import React, {useState} from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import {SafeAreaView} from 'react-native-safe-area-context'
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome'
import FeatherIcon from 'react-native-vector-icons/Feather'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

const HostDetailPage = ({route, navigation}) => {
  const {accommodation} = route.params
  let images = Object.values(accommodation.Images || {})

  if (images.length > 1) {
    const mainImage = images.splice(images.length - 2, 1)[0]
    images.unshift(mainImage)
  }

  const [currentPage, setCurrentPage] = useState(0)

  const handleScroll = event => {
    const page = Math.round(
      event.nativeEvent.contentOffset.x /
        event.nativeEvent.layoutMeasurement.width,
    )
    setCurrentPage(page)
  }

  const handleEditPress = () => {
    alert('Edit functionality is not implemented yet')
  }

  const handleChangePress = () => {
    alert('Change functionality is not implemented yet')
  }

  const imageWidth = Dimensions.get('window').width

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              name="chevron-back-outline"
              size={24}
              color="black"
              style={styles.icon}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={{flex: 1}}>
          <ScrollView
            horizontal={true}
            contentContainerStyle={styles.imageContainer}
            pagingEnabled={true}
            onScroll={handleScroll}
            scrollEventThrottle={100}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image
                  source={{uri: image}}
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

          <View style={styles.detailContainer}>
            <Text style={styles.title}>{accommodation.Title}</Text>
            <Text style={styles.description}>{accommodation.Description}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleEditPress}>
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleChangePress}>
              <Text style={styles.buttonText}>Change</Text>
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
            <View style={styles.imageWrapper}></View>

            <View style={styles.randomTextWrapper}>
              <Text style={styles.randomText}>
                Goat milking at Timo’s farm in Haarlem
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

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
  imageContainer: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
  },
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
  button: {
    width: 80,
    borderWidth: 2,
    borderColor: 'green',
    borderRadius: 25,
    padding: 8,
    marginLeft: 45,
    height: 37,
    backgroundColor: 'green',
  },
  buttonText: {
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
  verifiedHostText: {
    marginLeft: 20,
    color: 'black',
    fontSize: 16,
    fontFamily: 'MotivaSansBold.woff',
    marginVertical: 20,
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
})

export default HostDetailPage
