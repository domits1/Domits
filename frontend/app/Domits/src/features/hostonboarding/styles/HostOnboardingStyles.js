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
  // Grid list
  gridItemImage: {
    width: "80%",
    height: "80%",
    resizeMode: "contain",
    borderRadius: 3,
  },
  gridItemContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-evenly',
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    margin: 5,
    padding: 20,
    backgroundColor: COLORS.domitsHostBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  selectedGridItem: {
    backgroundColor: 'rgba(13,68,124,0.75)'
  },
  gridItemText: {
    color: 'white',
    textAlign: 'center'
  },
})