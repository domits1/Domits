import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FeatherIcon from 'react-native-vector-icons/Feather';



const Detailpage = () => {
  const images = [
    require('./pictures/detailPhoto.jpg'),
    require('./pictures/detailPhoto2.jpg'),
    require('./pictures/detailPhoto3.jpg'),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AntDesign name="leftcircleo" size={24} color="black" style={styles.icon} />

        <View style={styles.iconContainer}>
          <FeatherIcon name="message-square" size={24} color="black" style={styles.icon1} />
          <FeatherIcon name="settings" size={24} color="black" style={styles.icon2} />
        </View>
      </View>

      <ScrollView>
        <ScrollView horizontal={true} contentContainerStyle={styles.imageContainer}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={image} style={styles.image} />
            </View>
          ))}
        </ScrollView>

        <View>
          <Text style={styles.text}>Minimalistic and cozy apartment in Haarlem</Text>
          <Text style={styles.additionalText}>
            The perfect getaway for 2 people in Haarlem to relax with 100% cozy vibes!
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
        <View style={styles.book}>
          <Text style={styles.bookText2}>Book</Text>
        </View>
      </View>
      <View style={styles.horizontalLine} />

      <Text style={styles.verifiedHostText}>Verified Host</Text>


      <View style={styles.hostInfoContainer}>
        <View style={styles.namebutton}>
          <Text style={styles.nameText}>Huub Homer</Text>
        </View>
        <View style={styles.rightHostInfo}>
          <View style={styles.hostRatingContainer}>
            <Text style={styles.hostRatingText}>Huub Homer has an average star rating of 4.4 </Text>
            
          </View>
        </View>
        
        </View>
        <View style={styles.horizontalLine1} />

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
    padding: 15,
    flexDirection: 'row',
  },
  imageWrapper: {
    marginRight: 10,
  },
  image: {
    width: 360,
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
    marginLeft: 50,
    height: 38,
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
    marginVertical: 15,
    alignSelf: 'center',
    width: 330,
  },
  horizontalLine1: {
    height: 1,
    backgroundColor: 'black',
    marginBottom: 1000, // this is for test so that i can scroll up and down
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
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'MotivaSansRegular.woff',
  },
});

export default Detailpage;
