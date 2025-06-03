import {StyleSheet} from "react-native";
import {COLORS} from "../../../styles/COLORS";

export const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.domitsHostBlue,
    borderRadius: 3,
    padding: 10,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  buttonText: {
    color: "white",
  },
  onboardingPageTitle: {
    fontSize: 32,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    color: 'black'
  },
  // Property type
  typeItemContainer: {
    alignItems: "center",
  },
  typeItem: {
    aspectRatio: 1,
    margin: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.domitsHostBlue,
    borderRadius: 5,
  },
  selectedTypeItem: {
    backgroundColor: 'rgba(13,68,124,0.75)'
  },
  typeImage: {
    width: "80%",
    height: "80%",
    resizeMode: "contain",
    borderRadius: 3,
  },
  typeItemText: {
    fontSize: 20,
    color: 'white'
  }
})