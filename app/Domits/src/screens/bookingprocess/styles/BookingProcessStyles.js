import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        paddingHorizontal: 10,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    image: {
        width: '100%',
        height: 300,
        resizeMode: 'cover',
    },
    detailsContainer: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    description: {
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    separator: {
        borderBottomColor: '#ddd',
        borderBottomWidth: 1,
        marginVertical: 10,
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    sectionContent: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
    },
    linkText: {
        fontSize: 16,
        color: '#0056b3',
    },
    priceDetails: {
        marginBottom: 20,
    },
    priceBreakdown: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    fee: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    tax: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    serviceFee: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    total: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    bookButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        borderRadius: 5,
        marginBottom: 10,
    },
    bookButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    navbar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f0f0f0',
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guestAmountModalContent: {
        width: '80%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    guestRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    guestType: {
        fontSize: 16,
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    counterButton: {
        fontSize: 20,
        paddingHorizontal: 10,
        color: '#4CAF50',
    },
    counterText: {
        fontSize: 16,
        marginHorizontal: 10,
    },
    closeButton: {
        backgroundColor: 'red',
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 5,
        marginTop: 10,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    calendarModalContent: {
        width: '90%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 15,
        width: '100%',
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});