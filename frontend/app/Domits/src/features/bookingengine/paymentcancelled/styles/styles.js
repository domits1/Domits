import {StyleSheet} from 'react-native';

export const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    image: {
        marginTop: 70,
        alignSelf: 'center',
        width: '90%',
        height: '100%',
        maxHeight: 100,
        borderRadius: 20,
    },
    cancelledContainer: {
        alignSelf: 'center',
        width: '90%',
        height: '100%',
        borderRadius: 15,
        backgroundColor: '#C1121F',
    },
    cancelledContent: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: '95%',
        display: 'flex',
    },
    cancelledLabel: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
        lineHeight: 24,
    },
    cancelledTextContent: {
        color: 'white',
        fontWeight: '800',
        fontSize: 12,
        lineHeight: 24,
    },
    contentContainer: {
        alignSelf: 'center',
        width: '90%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: 'white',
        // iOS shadow properties
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.5,
        // Android shadow properties
        elevation: 4,
    },
    content: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: '95%',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        color: 'black',
        fontWeight: '800',
        fontSize: 16,
        lineHeight: 24,
    },
    textContent: {
        color: 'black',
        fontWeight: '400',
        fontSize: 12,
        lineHeight: 24,
    },
    // Try again button
    tryAgainButton: {
        alignSelf: 'center',
        width: '85%',
        height: 40,
        backgroundColor: '#C1121F',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    }
})