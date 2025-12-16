import {StyleSheet} from "react-native";

const styles = StyleSheet.create({
    activityIndicatorContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicators: {
        padding: 16, alignItems: 'center',
    },
    errors: {
        color: '#FF3300'
    },
    categoryContainer: {
        height: 60,
        marginBottom: 5,
    },
    categoryScrollContent: {
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    categoryButton: {
        marginRight: 10,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    categoryButtonSelected: {
        backgroundColor: '#000',
    },
    categoryButtonUnselected: {
        backgroundColor: '#fff',
    },
    categoryText: {
        fontWeight: '600',
        fontFamily: 'MotivaSansRegular.woff',
    },
    categoryTextSelected: {
        color: '#fff',
    },
    categoryTextUnselected: {
        color: '#000',
    }
})

export default styles;