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
    descriptionText: {
        fontSize: 16,
        color: 'gray',
        marginTop: 8,
        marginBottom: 20,
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
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginHorizontal: 10,
    },
    listItemText: {
        fontSize: 18,
    },
});