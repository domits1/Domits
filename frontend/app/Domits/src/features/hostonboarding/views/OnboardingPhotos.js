import {launchImageLibrary} from 'react-native-image-picker';
import {styles} from "../styles/HostOnboardingStyles";
import {Image, ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useEffect, useState} from "react";

const OnboardingPhotos = ({formData, updateFormData, reportValidity, markVisited}) => {
  const MIN_AMOUNT_IMAGES = 5;
  const MAX_AMOUNT_IMAGES = 10;
  const MIN_FILE_SIZE = 50 * 1024; // 50 kB
  const MAX_FILE_SIZE = 500 * 1024; // 500 kB

  const [images, setImages] = useState(formData.localImages || []);
  const [errorMessage, setErrorMessage] = useState("");
  const [canAddImage, setCanAddImage] = useState(images.length < MAX_AMOUNT_IMAGES);

  const onAddImage = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
    }

    launchImageLibrary(options,
        (pickedImage) => {
          if (pickedImage.errorCode) {
            console.error('ImagePicker Error: ', pickedImage.errorMessage);
          } else {
            if (pickedImage.fileSize < MIN_FILE_SIZE) return setErrorMessage(`File size must be at least ${MIN_FILE_SIZE / 1024} kB`);
            if (pickedImage.fileSize > MAX_FILE_SIZE) return setErrorMessage(`File size cannot be bigger than ${MIN_FILE_SIZE / 1024} kB`);

            setImages(prevImages => [...prevImages, pickedImage]);
          }
        }
    )
  }

  const onRemoveImage = (targetImage) => {
    setImages(prevImages =>
        prevImages.filter(img => img.uri !== targetImage.uri)
    );
  };

  useEffect(() => {
    images.length === MAX_AMOUNT_IMAGES ? setCanAddImage(false) : setCanAddImage(true);

    if (images.length < MIN_AMOUNT_IMAGES) {
      reportValidity(false);
      setErrorMessage(`You must have at least ${MIN_AMOUNT_IMAGES} photos of your property`);
    } else {
      reportValidity(true);
      setErrorMessage("");
    }

    const imagesBase64 = [];
    const localImages = [];
    images.forEach(image => {
      const base64Data = image.base64;
      const mimeType = image.type;
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      localImages.push({
        uri: image.uri,
      })
      imagesBase64.push({
        key: image.fileName,
        image: dataUri
      })
    })

    updateFormData((draft) => {
      draft.propertyImages = imagesBase64;
      draft.localImages = localImages;
    })
  }, [images])

  useEffect(() => {
    markVisited(true);
  }, [])

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Add photos of your property"}/>
          </Text>
          <Text style={styles.onboardingPageDescription}>
            {images.length}/{MAX_AMOUNT_IMAGES} photos added.{'\n'}
            Click a photo to remove it.
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

            <TouchableOpacity style={styles.addImageButton} disabled={!canAddImage} onPress={onAddImage}>
              <Text style={[styles.addImageButtonText, !canAddImage && styles.addImageButtonTextDisabled]}>
                <TranslatedText textToTranslate={'Add photo'}/>
              </Text>
            </TouchableOpacity>

            {errorMessage ?
                <Text style={styles.errorText}>
                  <TranslatedText textToTranslate={errorMessage}/>
                </Text>
                : null
            }

          </ScrollView>
        </View>
      </ScrollView>
  )
}

export default OnboardingPhotos;