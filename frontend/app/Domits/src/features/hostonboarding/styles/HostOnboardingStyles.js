import {StyleSheet} from "react-native";
import {COLORS} from "../../../styles/COLORS";

export const styles = StyleSheet.create({
  onboardingPageTitle: {
    fontSize: 32,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    color: 'black'
  },
  onboardingPageDescription: {
    color: 'rgba(70,70,70,0.7)',
    marginBottom: 20,
  },
  // Navigation
  navButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navButton: {
    backgroundColor: COLORS.domitsHostBlue,
    borderRadius: 3,
    padding: 10,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  navButtonText: {
    color: "white",
  },
  // Page
  safeAreaContainer: {
    flex: 1,
  },
  safeAreaNavMargin: {
    marginBottom: 20,
  },
  scrollContainer: {
    paddingVertical: 10,
  },
  contentContainer: {
    marginHorizontal: 20,
  },
  // Error
  errorText: {
    color: 'red',
    fontWeight: '500',
    textAlign: 'center',
  },
  inputFieldError: {
    backgroundColor: 'rgba(255,128,128,0.10)'
  },
  // Input
  inputItem: {
    marginBottom: 10,
  },
  inputTitle: {
    color: 'black',
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainerCenter: {
    width: '90%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  inputContainer: {
    maxWidth: 600,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 10,
    borderColor: COLORS.domitsHostBlue,
    padding: 10,
    marginVertical: 5,
  },
  // List
  listItemContainer: {
    alignItems: 'center',
  },
  listItem: {
    borderWidth: 1,
    borderColor: COLORS.domitsHostBlue,
    borderRadius: 10,
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 10,
    width: '90%',
    maxWidth: 600
  },
  listItemTitle: {
    fontSize: 30,
    fontWeight: 600,
    color: 'black',
  },
  listItemDescription: {
    color: "rgba(70,70,70,0.7)",
  },
  selectedListItem: {
    backgroundColor: COLORS.domitsHostBlue,
  },
  selectedItemText: {
    color: 'white',
  },
  // Grid list
  gridItemContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
  },
  gridItemImage: {
    width: "80%",
    height: "80%",
    resizeMode: "contain",
    borderRadius: 3,
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    margin: 5,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.domitsHostBlue,
  },
  gridItemText: {
    textAlign: 'center',
    color: 'black',
  },
  selectedGridItem: {
    backgroundColor: COLORS.domitsHostBlue,
  },
  selectedGridItemText: {
    color: 'white',
  }
})