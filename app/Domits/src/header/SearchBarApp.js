import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text, SafeAreaView, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import GooglePlacesInput from '../header/GooglePlacesInput';

function SearchBarApp() {
  const [addGuestText, setAddGuestText] = useState('0');
  const [numberOfGuestsText, setNumberOfGuestsText] = useState('0');
  const [selectDatesText, setSelectDatesText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddGuest = () => {
    setAddGuestText((prev) => (parseInt(prev, 10) + 1).toString());
    setNumberOfGuestsText((prev) => (parseInt(prev, 10) + 1).toString());
  };

  const handleRemoveGuest = () => {
    setAddGuestText((prev) => Math.max(0, Math.floor(parseInt(prev, 10)) - 1).toString());
    setNumberOfGuestsText((prev) => Math.max(0, Math.floor(parseInt(prev, 10)) - 1).toString());
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.searchBarContainer} onPress={handleToggleExpand}>
        <Text style={styles.placeholderText}>
          <Text style={styles.boldText}>Country</Text> + Where - When - Who
        </Text>

        {isExpanded && (
          <TouchableWithoutFeedback>
            <View style={styles.expandedContainer}>
              
              <GooglePlacesInput />

              <View style={styles.expandedInputContainer}>
                <Text style={styles.expandedItem}>Add guests</Text>
                <View style={styles.guestInputContainer}>
                  <TouchableOpacity onPress={handleRemoveGuest}>
                    <Icon name="minus-circle" size={20} color="black" style={styles.guestIcon} />
                  </TouchableOpacity>
                  <Text style={styles.guestCount}>{addGuestText}</Text>
                  <TouchableOpacity onPress={handleAddGuest}>
                    <Icon name="plus-circle" size={20} color="black" style={styles.guestIcon} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.expandedInputContainer}>
                <Text style={styles.expandedItem}>Number of guests</Text>
                <Text style={styles.guestCount}>{numberOfGuestsText}</Text>
              </View>

              <View style={styles.expandedInputContainer}>
                <Text style={styles.expandedItem}>Select dates</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="When?"
                  placeholderTextColor="#666"
                  value={selectDatesText}
                  onChangeText={(text) => setSelectDatesText(text)}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        )}

        <View style={styles.searchIconContainer}>
          <Icon name="search" size={20} color="black" style={styles.searchIcon} />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginLeft: 27,
  },
  searchBarContainer: {
    width: 343,
    top: 10,
    backgroundColor: '#ffff',
    borderRadius: 18,
    padding: 10,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  searchIconContainer: {
    marginLeft: 25,
  },
  searchIcon: {
    marginLeft: 57,
  },
  placeholderText: {
    marginRight: 5,
    color: '#333',
    fontSize: 13,
    fontFamily: 'MotivaSansRegular.woff',
  },
  expandedContainer: {
    backgroundColor: 'white',
    borderRadius: 18,
    marginTop: 20,
    padding: 25,
    width: 380,
    position: 'absolute',
    left: -27,
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
    fontSize: 17,
    fontFamily: 'MotivaSansBold.woff',
  },
  searchInputBar: {
    height: 35,
    marginRight: 110,
    color: '#333',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  guestInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  guestIcon: {
    marginHorizontal: 10,
  },

  guestCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  filterIconContainer: {
    marginLeft: 10,
    padding: 10,
  },
  filterIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'black',
  },
});

export default SearchBarApp;
