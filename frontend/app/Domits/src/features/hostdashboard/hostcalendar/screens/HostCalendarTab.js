import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../../../context/AuthContext";
import CalendarComponent from "../components/CalendarComponent";
import {styles} from "../styles/HostCalendarStyles";
import TabHeader from "../../../../screens/accounthome/components/TabHeader";

function HostCalendarTab() {
  const { userAttributes, isAuthenticated, checkAuth } = useAuth();
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);

  const userId = userAttributes?.sub;

  const handleSelectAccommodation = (accommodationId) => {
    const accommodation = accommodations.find(
      (accommodation) => accommodation.ID === accommodationId
    );
    setSelectedAccommodation(accommodation);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      checkAuth();
    }
  }, [isAuthenticated]);

  const fetchAccommodations = async () => {
    setIsLoading(true);
    if (!userId) {
      console.log("No user ID available");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation",
        {
          method: "POST",
          body: JSON.stringify({ OwnerId: userId }),
          headers: { "Content-Type": "application/json; charset=UTF-8" },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch accommodations");
      }
      const data = await response.json();

      if (data.body && typeof data.body === "string") {
        const accommodationsArray = JSON.parse(data.body);
        if (Array.isArray(accommodationsArray)) {
          setAccommodations(accommodationsArray);
        } else {
          console.error("Parsed data is not an array:", accommodationsArray);
          setAccommodations([]);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAccommodations();
    }
  }, [userId]);

  const updateDates = (dateRanges) => {
    // Add your update logic here
  };

  if (!userAttributes) {
    return (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading user information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <TabHeader tabTitle={'Calendar & Prices'}/>
      {isLoading ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : accommodations.length < 1 ? (
        <Text style={styles.noAccommodationsText}>No accommodations found...</Text>
      ) : (
        <View style={styles.calendarContent}>
          <Text style={styles.header}>Calendar</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedAccommodation?.ID || ""}
              onValueChange={(itemValue) => handleSelectAccommodation(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select your Accommodation" value="" />
              {accommodations.map((accommodation) => (
                <Picker.Item
                  key={accommodation.ID}
                  label={accommodation.Title}
                  value={accommodation.ID}
                />
              ))}
            </Picker>
          </View>
          {selectedAccommodation ? (
            <View style={styles.calendarContainer}>
              <Text style={styles.accommodationText}>
                Booking availability for {selectedAccommodation.Title}
              </Text>
              <CalendarComponent
                passedProp={selectedAccommodation}
                isNew={false}
                updateDates={updateDates}
              />
            </View>
          ) : (
            <Text style={styles.alertMessage}>
              Please select your Accommodation first
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default HostCalendarTab;
