import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import featureIcons from '../ui-components/FeatureIcons';
import FetchOwnerData from '../features/search/FetchOwnerData';
import FetchAccommodation from '../features/search/FetchAccommodation';
import Ionicons from "react-native-vector-icons/Ionicons";

const Detailpage = ({route, navigation}) => {
    const accommodationId = route.params.accommodation.id;
    const [parsedAccommodation, setParsedAccommodation] = useState({});
    const [owner, setOwner] = useState();
    const [loading, setLoading] = useState(true);
    const [images, setImages] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    // Dynamically calculate image width based on screen width
    const imageWidth = Dimensions.get('window').width;

    /**
     * Fetch current accommodation data.
     */
    useEffect(() => {
        FetchAccommodation(accommodationId, setParsedAccommodation, setLoading).then().catch(error => {
            console.error('Error fetching accommodation:', error);
        });
    }, [accommodationId]);

    /**
     * Fetch owner data of the current accommodation.
     */
    useEffect(() => {
        const ownerId = parsedAccommodation.OwnerId;
        FetchOwnerData(ownerId, setOwner).then().catch(error => {
            console.error('Error fetching owner data:', error);
        });
    }, [parsedAccommodation]);

    useEffect(() => {
        if (parsedAccommodation && parsedAccommodation.Images) {
            const originalImages = parsedAccommodation.Images;

            const updatedImages = Object.entries(originalImages)
                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                .map(([key, url]) => {
                    const updatedUrl = url.replace('detail', 'mobile');
                    return {uri: updatedUrl};
                });
            setImages(updatedImages);
        } else if (!loading) {
            console.warn('No Images object found in parsed accommodation data.');
        }
    }, [parsedAccommodation, loading]);

    const handleHomeScreenPress = () => {
        navigation.navigate('HomeScreen');
    };

    const handleOnBoardingPress = () => {
        //TODO Remove ToastAndroid message after working booking system
        ToastAndroid.show("Sorry, we currently do not accept bookings.", ToastAndroid.SHORT)
//    navigation.navigate('onBoarding1', {
//      accommodation,
//      parsedAccommodation,
//      images,
//    });

    };
    const handleScroll = event => {
        const page = Math.round(
            event.nativeEvent.contentOffset.x /
            event.nativeEvent.layoutMeasurement.width,
        );
        setCurrentPage(page);
    };

    const toggleModal = () => {
        setShowModal(!showModal);
    };

    const renderAmenities = () => {
        const allAmenities = parsedAccommodation.Features || {};
        const categoriesToShow = Object.keys(allAmenities)
            .filter(category => allAmenities[category].length > 0)
            .slice(0, 3);

        return categoriesToShow.map((category, categoryIndex) => {
            const items = allAmenities[category].slice(0, 5);

            return (
                <View key={categoryIndex}>
                    <Text style={styles.categorySubTitle}>{category}</Text>
                    <View style={styles.subCategoryDivider}/>

                    {items.map((item, itemIndex) => (
                        <View key={itemIndex} style={styles.featureIconItem}>
                            {featureIcons[item] ? (
                                <View style={styles.featureIcon}>{featureIcons[item]}</View>
                            ) : null}
                            <Text style={styles.featureText}>{item}</Text>
                        </View>
                    ))}
                </View>
            );
        });
    };

    const FeaturePopup = ({features, onClose}) => {
        return (
            <Modal transparent={true} visible={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>✖</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            What does this place have to offer?
                        </Text>
                        <ScrollView>
                            {Object.keys(features).map(category => {
                                const categoryItems = features[category];
                                if (categoryItems.length > 0) {
                                    return (
                                        <View key={category}>
                                            <Text style={styles.categorySubTitle}>{category}</Text>
                                            <View style={styles.subCategoryDivider}/>
                                            {categoryItems.map((item, index) => (
                                                <View key={index} style={styles.categoryItem}>
                                                    {typeof featureIcons[item] === 'string' ? (
                                                        <Image
                                                            source={{uri: featureIcons[item]}}
                                                            style={styles.featureIcon}
                                                        />
                                                    ) : featureIcons[item] ? (
                                                        <View style={styles.featureIcon}>
                                                            {featureIcons[item]}
                                                        </View>
                                                    ) : null}
                                                    <Text style={styles.featureText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    );
                                }
                                return null;
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderDateRange = () => {
        const dateRanges = parsedAccommodation.DateRanges || [];

        if (dateRanges.length === 0) {
            return null;
        }

        const sortedRanges = dateRanges.sort(
            (a, b) => new Date(a.startDate) - new Date(b.startDate),
        );

        const earliestDate = new Date(sortedRanges[0].startDate);
        const latestDate = new Date(sortedRanges[sortedRanges.length - 1].endDate);

        const formatDate = date => {
            const day = date.toLocaleDateString('en-US', {
                day: 'numeric',
                timeZone: 'UTC',
            });
            const month = date.toLocaleDateString('en-US', {
                month: 'long',
                timeZone: 'UTC',
            });
            return `${day} ${month}`;
        };

        return (
            <View>
                <Text>
                    {formatDate(earliestDate)} - {formatDate(latestDate)}
                </Text>
            </View>
        );
    };

    const renderDotIndicator = () => {
        return (
            <View style={styles.dotContainer}>
                {images.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            currentPage === index ? styles.activeDot : styles.inactiveDot,
                        ]}
                    />
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff"/>
            </View>
        );
    }

    return (
        <SafeAreaView style={{flex: 1}}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleHomeScreenPress}>
                        <Ionicons
                            name="chevron-back-outline"
                            size={24}
                            style={styles.headerIcon}
                        />
                    </TouchableOpacity>
                    <Text style={styles.titleText}>{parsedAccommodation.Title}</Text>
                </View>

                <ScrollView style={{flex: 1}}>
                    <ScrollView
                        horizontal={true}
                        contentContainerStyle={styles.imageContainer}
                        pagingEnabled={true}
                        onScroll={handleScroll}
                        scrollEventThrottle={100}>
                        {Object.entries(images).map(([key, url]) => (
                            <View key={key}>
                                <Image
                                    source={{uri: url.uri}}
                                    style={[styles.image, {width: imageWidth}]}
                                />
                            </View>
                        ))}
                    </ScrollView>
                    <View style={styles.counterContainer}>{renderDotIndicator()}</View>

                    <View style={styles.mainContentContainer}>
                        <View style={styles.mainInfoContainer}>
                            <Text style={styles.subtitleText}>
                                {parsedAccommodation.Subtitle.trim()}
                            </Text>
                            <Text style={styles.costPerNightText}>€{parsedAccommodation.Rent.toFixed(2)} per
                                night</Text>
                            <Text>{renderDateRange()}</Text>
                        </View>

                        <View style={styles.borderContainer}>
                            <View style={styles.mainAmenityContainer}>
                                <View style={styles.featureIcon}>
                                    {featureIcons["Multiple guests"]}
                                </View>
                                <Text style={styles.mainAmenitiesText}>
                                    {parsedAccommodation.GuestAmount} guest(s)
                                </Text>
                            </View>
                            <View style={styles.mainAmenityContainer}>
                                <View style={styles.featureIcon}>
                                    {featureIcons["Bedroom"]}
                                </View>
                                <Text style={styles.mainAmenitiesText}>
                                    {parsedAccommodation.bedrooms || 0} bedroom(s)
                                </Text>
                            </View>
                            <View style={styles.mainAmenityContainer}>
                                <View style={styles.featureIcon}>
                                    {featureIcons["Bed"]}
                                </View>
                                <Text style={styles.mainAmenitiesText}>
                                    {parsedAccommodation.Beds} bed(s)
                                </Text>
                            </View>
                            <View style={styles.mainAmenityContainer}>
                                <View style={styles.featureIcon}>
                                    {featureIcons["Bathroom"]}
                                </View>
                                <Text style={styles.mainAmenitiesText}>
                                    {parsedAccommodation.Bathrooms} bathroom(s)
                                </Text>
                            </View>
                        </View>

                        <View style={styles.bookingButtonContainer}>
                            <View style={styles.bookingButton}>
                                <TouchableOpacity onPress={handleOnBoardingPress} style={styles.bookingButtonContent}>
                                    <Text style={styles.bookingButtonText}>Book</Text>
                                    <Ionicons name={'arrow-forward-circle-outline'} size={24}
                                              style={styles.bookingButtonIcon}></Ionicons>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.descriptionContainer}>
                            <Text style={styles.descriptionText}>
                                {parsedAccommodation.Description.trim()}
                            </Text>
                        </View>

                        <View style={styles.categoryDivider}/>

                        <Text style={styles.categoryTitle}>Amenities</Text>
                        <View style={styles.amenities}>{renderAmenities()}</View>
                        <View>
                            <TouchableOpacity
                                onPress={toggleModal}
                                style={styles.ShowAllAmenitiesButton}>
                                <Text style={styles.ShowAllAmenitiesButtonText}>Show all amenities</Text>
                            </TouchableOpacity>
                            {showModal && (
                                <FeaturePopup
                                    features={parsedAccommodation.Features}
                                    onClose={toggleModal}
                                />
                            )}
                        </View>

                        <View style={styles.categoryDivider}/>

                        <Text style={styles.categoryTitle}>Hosted by</Text>
                        <View style={styles.hostInfoContainer}>
                            <View style={styles.nameButton}>
                                <Text style={styles.nameText}>{owner}</Text>
                            </View>
                        </View>

                        <View style={styles.categoryDivider}/>

                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
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

export default Detailpage;
