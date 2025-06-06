import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    headerRightIcons: {
        flexDirection: 'row',
    },
    rightIcon: {
        marginLeft: 20,
    },

    sectionTitle: {
        fontSize: 22,
        fontWeight: '600',
        color: '#000',
        paddingLeft: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    bookingInfoCard: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        overflow: 'hidden',
        marginLeft: 20,
        marginRight: 20,
    },
    bookingImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    locationText: {
        fontWeight: '600',
        fontSize: 18,
        marginTop: 10,
        marginLeft: 10,
    },
    dateText: {
        fontSize: 16,
        color: '#666',
        marginLeft: 10,
        marginTop: 5,
    },
    guestsText: {
        fontSize: 16,
        marginLeft: 10,
        marginTop: 5,
    },
    totalText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        marginTop: 5,
    },
    propertyDescription: {
        fontSize: 16,
        marginLeft: 10,
        marginTop: 5,
        marginBottom: 10,
    },
    emailButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    emailButtonText: {
        fontSize: 16,
        color: '#0056b3',
    },
    previousBookingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4F6D7A',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginHorizontal: 20,
        marginTop: 20,
    },
    previousBookingsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginRight: 5,
    },
    savedBookingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#61C46D',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginHorizontal: 20,
        marginTop: 20,
    },
    savedBookingsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginRight: 5,
    },

    personalInfo: {
        fontSize: 16,
        marginLeft: 20,
        marginTop: 10,
    },
    personalInfoEmail: {
        // Similar to personalInfo
    },
    personalInfoAddress: {
        // Similar to personalInfo
    },
    removeDataButton: {
        // Styles for remove data buttons
    },
    removeDataText: {
        fontSize: 16,
        color: '#FF0000',
        marginLeft: 20,
        marginTop: 10,
    },
    disclaimerText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 20,
        marginTop: 20,
        marginBottom: 20,
    },
    bookingDetails: {}
});