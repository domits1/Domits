import React from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/MaterialIcons";

const Header = ({
  country,
  setCountry,
  loading,
  onSearchButtonPress,
  onCancelButtonPress,
}) => {
  const { t } = useTranslation();

  const handleClear = () => {
    onCancelButtonPress();
    setCountry("");
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.searchContainer}>
        {country?.length > 0 && (
          <TouchableOpacity
            testID="delete-button"
            disabled={loading}
            onPress={handleClear}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Icon name="close" size={20} color="#5f6368" />
          </TouchableOpacity>
        )}

        <View style={styles.inputWrapper}>
          <Icon
            name="location-on"
            size={20}
            color="#9aa0a6"
            style={styles.inputIcon}
          />

          <TextInput
            testID="SearchBar"
            style={styles.textInput}
            value={country}
            onChangeText={setCountry}
            placeholder={t("Where to")}
            placeholderTextColor="#9aa0a6"
            returnKeyType="search"
            editable={!loading}
            onSubmitEditing={() => onSearchButtonPress(country)}
          />
        </View>

        <TouchableOpacity
          testID="SearchButton"
          disabled={loading}
          onPress={() => onSearchButtonPress(country)}
          style={styles.searchButton}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },

  searchContainer: {
    minHeight: 56,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#fff",

    borderRadius: 18,

    paddingLeft: 10,
    paddingRight: 8,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,

    elevation: 6,
  },

  inputWrapper: {
    flex: 1,

    flexDirection: "row",
    alignItems: "center",

    minWidth: 0,
  },

  inputIcon: {
    marginLeft: 4,
    marginRight: 10,
  },

  textInput: {
    flex: 1,

    fontSize: 16,
    color: "#111",

    paddingVertical: 14,
  },

  iconButton: {
    width: 36,
    height: 36,

    borderRadius: 18,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 4,
  },

  searchButton: {
    width: 42,
    height: 42,

    borderRadius: 14,

    backgroundColor: "#16a34a",

    alignItems: "center",
    justifyContent: "center",

    marginLeft: 8,
  },
});