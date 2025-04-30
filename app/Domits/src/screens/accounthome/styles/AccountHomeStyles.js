import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginTop: 20,
    },
    welcomeText: {
        fontSize: 30,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    sectionContainer: {
        backgroundColor: '#fff',
        padding: 20,
        marginVertical: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginHorizontal: 10,
    },
    tabItemText: {
        fontSize: 18,
    },
    logOutButtonText: {
        fontSize: 18,
        color: '#ff3c3c',
    },
});