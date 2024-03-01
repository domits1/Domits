import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';

function SearchBarApp() {
  const [searchText, setSearchText] = useState('');

  const handleSearch = () => {
    console.log('Searching for:', searchText);
    // Add your custom search functionality here
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.searchBarContainer} onPress={handleSearch}>
        <TextInput
          style={styles.searchInput}
          placeholder="Country + Where - When - Who"
          placeholderTextColor="black"
          value={searchText}
          onChangeText={(text) => setSearchText(text)}
          onSubmitEditing={handleSearch}
        />
        <Image source={require('./pictures/search-icon.png')} style={styles.searchIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  searchBarContainer: {
    backgroundColor: '#ffff',
    borderRadius: 13,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 80,
    right: -142,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,

  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: 'black',
    marginLeft: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,  
    color: '#333',
    paddingVertical: 5,  
  },
});

export default SearchBarApp;