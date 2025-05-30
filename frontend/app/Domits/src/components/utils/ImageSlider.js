import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View, Animated } from 'react-native';

/**
 * @param {Object} images - Object with image URLs as values, e.g., { image1: 'url1', image2: 'url2' }
 * @param {number} seconds - Interval for switching images in seconds
 * @param {string} page 
 * @returns {JSX.Element}
 */
function ImageSlider({ images, seconds, page }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const fadeAnim = new Animated.Value(1);
    const ms = seconds * 1000;

    useEffect(() => {
        const imageKeys = Object.keys(images).filter((key) => key.startsWith('image'));
        const totalImages = imageKeys.length;

        const intervalId = setInterval(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                setCurrentImageIndex((prevIndex) => (prevIndex + 1) % totalImages);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            });
        }, ms);

        return () => {
            clearInterval(intervalId);
        };
    }, [images, seconds]);

    const imageKey = `image${currentImageIndex + 1}`;
    const imageSrc = images[imageKey];

    return (
        <View style={styles.container}>
            <Animated.Image
                source={{ uri: imageSrc }}
                style={[
                    page === 'dashboard' ? styles.accommodationImg : styles.imgSliderImage,
                    { opacity: fadeAnim },
                ]}
                resizeMode="cover"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    accommodationImg: {
        width: 300,
        height: 270,
        borderRadius: 15,
    },
    imgSliderImage: {
        width: 300,
        height: 200,
    },
});

export default ImageSlider;
