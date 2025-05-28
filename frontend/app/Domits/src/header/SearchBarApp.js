import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text, SafeAreaView, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import GooglePlacesInput from './GooglePlacesInput';
import { Calendar } from 'react-native-calendars';

function SearchBarApp() {
  const [addGuestText, setAddGuestText] = useState('0');
  const [numberOfGuestsText, setNumberOfGuestsText] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
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


  const handleToggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  
  const handleReset = () => {
    setSelectedDate('');
    setAddGuestText('0');
    setNumberOfGuestsText('0');
  };

  
  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setShowCalendar(false); 
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
    
                {/* Close button */}
                <TouchableOpacity onPress={handleToggleExpand} style={styles.closeButton}>
                  <Icon name="x" size={20} color="black" />
                </TouchableOpacity>
    
                {/* Date Selection */}
                <View style={styles.expandedInputContainer}>
                  <Text style={styles.expandedItem}>Select dates</Text>
                  <TouchableOpacity onPress={handleToggleCalendar}>
                    <Icon name="calendar" size={20} color="black" style={styles.calenderIcon}/>
                  </TouchableOpacity>
                  <Text>{selectedDate}</Text>
                </View>
    
                {/* Guest Selection */}
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
    
                
                <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
    
                
                {showCalendar && (
                  <Calendar
                    onDayPress={handleDayPress}
                   
                    markedDates={{
                      [startDate]: { startingDay: true, color: 'green' },
                      [endDate]: { endingDay: true, color: 'green' },
                    }}
                    
                  />
                )}
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
      marginLeft: 28,
    },
    searchBarContainer: {
      width: 345,
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
      backgroundColor: '#ffff',
      borderRadius: 18,
      marginTop: 19,
      padding: 25,
      width: 350,
      position: 'absolute',
      left: -5,
      top: 55,
    },
    closeButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 3,
    },
    expandedItem: {
      fontSize: 16,
      padding: 16,
      marginBottom: 10,
      color: '#333',
      fontFamily: 'MotivaSansBold.woff',
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
    calenderIcon: {
      marginRight: 0,
      top: -5,
    },
    resetButton: {
      backgroundColor: 'red',
      padding: 10,
      borderRadius: 5,
      marginTop: 10,
      width: 80,
      left: 220,
      alignItems: 'center',
    },
    resetButtonText: {
      color: 'white',
      fontFamily: 'MotivaSansBlack.woff',
      
    },
  });

  export default SearchBarApp;
