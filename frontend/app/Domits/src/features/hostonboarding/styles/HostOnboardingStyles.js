import {StyleSheet} from "react-native";
import {COLORS} from "../../../styles/COLORS";

export const styles = StyleSheet.create({
  onboardingPageTitle: {
    fontSize: 32,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
    color: 'black'
  },
  onboardingPageDescription: {
    textAlign: "center",
    color: 'rgba(70,70,70,0.7)',
    marginBottom: 20,
  },
  onboardingPageHeading1: {
    fontSize: 24,
    marginTop: 20,
    color: 'rgb(75,75,75)',
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
  lengthTrackerText: {
    textAlign: 'right',
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
  },
  // Counter
  counterGroupContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    marginBottom: 50,
  },
  counterItemContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    marginVertical: 5,
  },
  counterLabel: {
    flex: 1,
  },
  counterLabelText: {
    fontSize: 20,
  },
  counterGroup: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row-reverse',
  },
  counterGroupItem: {
    marginHorizontal: 5,
  },
  counterGroupText: {
    fontSize: 20,
  },
  numericInput: {
    fontSize: 20,
    borderBottomWidth: 1,
  },
  // Check screen table
  table: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    marginVertical: 20,
  },
  tableItem: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,200,200,0.75)',
  },
  labelItem: {
    flex: 1,
  },
  valueItem: {
    flex: 2,
  },
  labelText: {
    fontSize: 16,
    color: 'rgb(65,65,65)',
  },
  valueText: {
    fontSize: 16,
    color: 'rgb(110,110,110)',
  },
  // Check screen buttons
  goBackToEditContainer: {
    flexDirection: 'row',
  },
  goBackToEditButton: {
    backgroundColor: COLORS.domitsHostBlue,
    borderRadius: 5,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  goBackToEditIcon: {
    color: 'white',
  },
  goBackToEditText: {
    fontSize: 16,
    color: 'white',
    marginHorizontal: 5,
  },
  completeButtonContainer: {
    alignItems: "center",
  },
  completeButton: {
    backgroundColor: COLORS.domitsHostBlue,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  completeButtonDisabled: {
    backgroundColor: 'rgba(128,128,128,0.5)',
  },
  completeButtonText: {
    fontSize: 24,
    color: "white",
  },
  // Checkboxes
  checkboxContainer: {
    flexDirection: 'row',
    width: '95%',
    marginBottom: 10,
    alignItems: 'center'
  },
  // Switch
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
  },
  // Time
  timeSlotItem: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 3,
    marginVertical: 5,
    display: 'flex',
    alignSelf: 'flex-start',
  },
  timeItem: {
    borderWidth: 1,
    borderRadius: 5,
    borderColor: 'rgba(128,128,128,0.5)',
    padding: 3,
  },
  // Image
  addImageButton: {
    alignItems: 'center',
  },
  addImageButtonText: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 5,
  },
  image: {
    height: 200,
    width: 200,
  },
})