import {StyleSheet} from "react-native";
import {COLORS} from "../../../../styles/COLORS";

export const styles = StyleSheet.create({
  // Page
  safeAreaContainer: {
    flex: 1,
  },
  scrollContainer: {
    paddingVertical: 10,
  },
  contentContainer: {
    marginHorizontal: 10,
  },
  // Headings
  hostPageHeading: {
    borderWidth: 3,
    borderColor: 'rgba(0,51,102,0.25)',
    borderRadius: 15,
    padding: 10,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    color: 'black'
  },
  // Buttons
  addPropertyButton: {
    display: 'flex',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 3,
    borderColor: 'rgba(0,51,102,0.25)',
    borderRadius: 15,
    backgroundColor: COLORS.domitsHostBlue,
  },
  addPropertyButtonText: {
    color: 'white',
    marginLeft: 10,
  },
  // Box list properties
  propertyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  propertyImage: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 10,
  },
  propertyNameContainer: {
    flex: 1,
  },
  propertyNameText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  propertyStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  propertyStatusText: {
    paddingRight: 5,
  },
  // Error
  noListingsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#777',
  },
});
