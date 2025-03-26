import {StyleSheet} from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    // General
    categoryTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 5,
    },
    categorySubTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
        marginTop: 5,
    },
    categoryDivider: {
        height: 1,
        backgroundColor: 'black',
        marginVertical: 20,
        marginHorizontal: 30,
        alignSelf: 'stretch',
    },
    subCategoryDivider: {
        height: 1,
        backgroundColor: 'lightgray',
        marginVertical: 5,
    },
    // Header
    header: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    headerIcon: {
        color: 'black',
        marginHorizontal: 10,
    },
    titleText: {
        color: 'black',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 5,
        fontFamily: 'MotivaSansBold.woff',
    },
    // Loading screen
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Main content
    mainContentContainer: {
        marginTop: 10,
        marginHorizontal: 15,
    },
    // Accommodation image
    imageContainer: {
        flexDirection: 'row',
    },
    image: {
        height: 250,
    },
    // Main information
    mainInfoContainer: {
        marginBottom: 10,
    },
    subtitleText: {
        color: 'black',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'MotivaSansRegular.woff',
    },
    costPerNightText: {
        fontWeight: "bold",
    },
    // Main amenities
    borderContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    mainAmenityContainer: {
        padding: 5,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    mainAmenitiesText: {
        color: 'black',
        fontSize: 12,
        textAlign: 'center',
        fontFamily: 'MotivaSansRegular.woff',
    },
    // Calendar
    calendar: {
        borderWidth: 1,
        borderColor: 'grey',
        borderRadius: 10,
        marginVertical: 10,
    },
    // Booking button
    bookingButtonContainer: {
        marginHorizontal: 20,
    },
    bookingButton: {
        borderRadius: 15,
        padding: 8,
        backgroundColor: 'green',
        alignSelf: 'flex-end',
    },
    bookingButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookingButtonText: {
        color: 'white',
        fontSize: 20,
        textAlign: 'center',
        marginHorizontal: 5,
        fontFamily: 'MotivaSansRegular.woff',
    },
    bookingButtonIcon: {
        color: 'white',
    },
    // Accommodation description
    descriptionContainer: {
        marginHorizontal: 10,
        marginVertical: 10,
    },
    descriptionText: {
        color: 'black',
        fontSize: 14,
        fontFamily: 'MotivaSansRegular.woff',
    },
    // Amenities
    amenities: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    featureIconItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    featureIcon: {
        width: 24,
        height: 24,
        marginRight: 8,
    },
    featureText: {
        fontSize: 14,
        color: 'black',
    },
    // Host
    nameButton: {
        width: 110,
        borderWidth: 1,
        borderColor: 'green',
        borderRadius: 12,
        padding: 10,
    },
    nameText: {
        color: 'black',
        fontSize: 12,
        fontFamily: 'MotivaSansBold.woff',
        textAlign: 'center',
    },
    // All amenities modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    closeButton: {
        alignSelf: 'flex-end',
    },
    closeButtonText: {
        fontSize: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    ShowAllAmenitiesButton: {
        borderWidth: 2,
        borderColor: 'green',
        borderRadius: 15,
        padding: 8,
        alignSelf: 'center',
    },
    ShowAllAmenitiesButtonText: {
        fontSize: 16,
        color: 'black',
        textAlign: 'center',
    },
    // Rendering dot
    counterContainer: {
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.0)',
        borderTopLeftRadius: 8,
        borderBottomRightRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterText: {
        fontSize: 16,
        color: 'white',
        fontFamily: 'MotivaSansRegular.woff',
        marginLeft: 2,
    },
    dotContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: 'green',
    },
    inactiveDot: {
        backgroundColor: 'gray',
    },
});