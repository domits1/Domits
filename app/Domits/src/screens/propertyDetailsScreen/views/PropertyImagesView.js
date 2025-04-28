import {Dimensions, Image, ScrollView, View} from "react-native";
import {styles} from "../styles/propertyDetailsStyles";
import React, {useState} from "react";
import {S3URL} from "../../../store/constants";

const PropertyImagesView = ({images}) => {
    const [currentPage, setCurrentPage] = useState(0);
    const imageWidth = Dimensions.get('window').width;

    const handleScroll = event => {
        const page = Math.round(
            event.nativeEvent.contentOffset.x /
            event.nativeEvent.layoutMeasurement.width,
        );
        setCurrentPage(page);
    };

    return(
        <View>
            <ScrollView
                horizontal={true}
                contentContainerStyle={styles.imageContainer}
                pagingEnabled={true}
                onScroll={handleScroll}
                scrollEventThrottle={100}>
                {images.map(image => (
                    <View key={image.key}>
                        <Image
                            source={{
                                uri: `${S3URL}${image.key}`,
                            }}
                            style={[styles.image, {width: imageWidth}]}
                        />
                    </View>
                ))}
            </ScrollView>

            <View style={styles.counterContainer}>
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
            </View>
        </View>

    )
}

export default PropertyImagesView;