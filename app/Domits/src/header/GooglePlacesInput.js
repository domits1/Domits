import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';
import FeatherIcon from 'react-native-vector-icons/Feather';

const GooglePlacesInput = () => {
  const [searchText, setSearchText] = useState('');

  const renderLeftButton = () => (
    <FeatherIcon
      name="search"
      size={20}
      color="black"
      style={styles.searchIcon}
    />
  );

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        placeholder="Search Destinations"
        onPress={(data, details = null) => {
          console.log(data, details);
          setSearchText(data.description);
        }}
        query={{
          language: 'en',
        }}
        styles={{
          container: styles.inputContainer,
          textInput: styles.input,
          placeholderText: styles.placeholder,
        }}
        renderLeftButton={renderLeftButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 15,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'black',
    borderRadius: 7,
    padding: 8,
    marginHorizontal: 0,
    paddingBottom: 0,
  },
  input: {
    flex: 1,
  },

  searchIcon: {
    marginRight: 10,
    marginVertical: 12,
  },
});

export default GooglePlacesInput;
