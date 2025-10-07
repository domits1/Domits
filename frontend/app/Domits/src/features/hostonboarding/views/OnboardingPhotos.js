import {launchImageLibrary} from 'react-native-image-picker';
import {styles} from "../styles/HostOnboardingStyles";
import {Image, ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useState} from "react";

const OnboardingPhotos = ({formData, updateFormData, reportValidity, markVisited}) => {
  const MAX_AMOUNT_IMAGES = 5;
  const [images, setImages] = useState([]);

  const onAddImage = () => {
    const options = {
      selectionLimit: 5,
      mediaType: 'photo',
      includeBase64: false,
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.7,
    }

    launchImageLibrary(options,
        (res) => {
          if (res.didCancel) {
            console.log('User cancelled image picker');
          } else if (res.errorCode) {
            console.error('ImagePicker Error: ', res.errorMessage);
          } else {
            setImages(prevImages => [...prevImages, res]);
          }
        }
    )
  }

  const onRemoveImage = (targetImage) => {
    setImages(prevImages =>
        prevImages.filter(img => img.uri !== targetImage.uri)
    );
  };

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Add photos of your property"}/>
          </Text>
          <Text style={styles.onboardingPageDescription}>
            <TranslatedText textToTranslate={"Max 5 photos. Click a photo to remove it."}/>
          </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>

            <ScrollView horizontal={true} contentContainerStyle={styles.imageSlider}>
              {images.map((image) => (
                  <TouchableOpacity key={image.uri} onPress={() => {
                    onRemoveImage(image)
                  }}>
                    <Image
                        resizeMode="contain"
                        resizeMethod="scale"
                        style={styles.image}
                        source={{uri: image.uri}}/>
                  </TouchableOpacity>
              ))
              }
            </ScrollView>

            <TouchableOpacity style={styles.addImageButton} onPress={onAddImage}>
              <Text style={styles.addImageButtonText}>
                <TranslatedText textToTranslate={'Add photo'}/>
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingPhotos;