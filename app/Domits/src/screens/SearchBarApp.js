import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';


// Component
function SearchBarApp() {
  const [whereToText, setWhereToText] = useState('');
  const [addGuestText, setAddGuestText] = useState('');
  const [numberOfGuestsText, setNumberOfGuestsText] = useState('');
  const [selectDatesText, setSelectDatesText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [scaleValue, setScaleValue] = useState(new Animated.Value(0));

  const handleSearch = () => {
    console.log('Searching for:', whereToText, addGuestText, numberOfGuestsText, selectDatesText);
  };

  const handleToggleExpand = () => {
  setIsExpanded(!isExpanded);

  Animated.parallel([
    Animated.timing(scaleValue, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }),
    Animated.timing(iconScaleValue, {
      toValue: isExpanded ? 1 : 1.2,  
      duration: 300,
      useNativeDriver: false,
    }),
  ]).start();
};

const iconScaleValue = useRef(new Animated.Value(1)).current;

const iconScaleInterpolation = iconScaleValue.interpolate({
  inputRange: [1, 1.2],
  outputRange: [1, 1.2],
});

const animatedIconStyle = {
  transform: [{ scale: iconScaleInterpolation }],
};


  const scaleInterpolation = scaleValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const animatedStyle = {
    transform: [{ scale: scaleInterpolation }],
  };
  

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.searchBarContainer} onPress={handleToggleExpand}>
        <Text style={styles.placeholderText}>
          <Text style={styles.boldText}>Country +</Text>  Where - When - Who
        </Text>
        <Animated.View style={[styles.expandedContainer, animatedStyle]}>
          {isExpanded && (
            <>
              <View style={styles.expandedInputContainer}>
                <Text style={styles.expandedItem}>Where to?</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="search . . ."
                  placeholderTextColor="#666"
                  value={whereToText}
                  onChangeText={(text) => setWhereToText(text)}
                />
              </View>
              <View style={styles.expandedInputContainer}>
                <Text style={styles.expandedItem}>Add guests</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="search . . ."
                  placeholderTextColor="#666"
                  value={addGuestText}
                  onChangeText={(text) => setAddGuestText(text)}
                />
              </View>
              <View style={styles.expandedInputContainer}>
                <Text style={styles.expandedItem}>Number of guests</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="search . . ."
                  placeholderTextColor="#666"
                  value={numberOfGuestsText}
                  onChangeText={(text) => setNumberOfGuestsText(text)}
                />
              </View>
              <View style={styles.expandedInputContainer}>
                <Text style={styles.expandedItem}>Select dates</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="search . . ."
                  placeholderTextColor="#666"
                  value={selectDatesText}
                  onChangeText={(text) => setSelectDatesText(text)}
                />
              </View>
            </>
          )}
        </Animated.View>
        <View style={styles.searchIconContainer}>
          <Icon name="search" size={20} color="black" style={styles.searchIcon} />
        </View>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    top: 20 ,
    backgroundColor: '#ffff',
    borderRadius: 18,
    padding: 10,
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  searchIconContainer: {
    marginLeft: 50,
  },
  searchIcon: {
    marginLeft: 10,
  },
  placeholderText: {
    marginRight: 5,
    color: '#333',
    fontSize: 13,
  },
  expandedContainer: {
    backgroundColor: 'white',
    borderRadius: 18,
    marginTop: 50,
    padding: 20,
    width: 350, 
    position: 'absolute',
    left: -25,
    top: 55,
  },
  expandedItem: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    marginBottom: 10,
    color: '#333',
    fontFamily: 'MotivaSansMedium',
  },
  expandedInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchInput: {
    height: 35,

    flex: 1,
    marginLeft: 20,
    color: '#333',
  },
  boldText: {
    fontWeight: 'bold',
    fontSize: 17,
    
  },
});

export default SearchBarApp;
