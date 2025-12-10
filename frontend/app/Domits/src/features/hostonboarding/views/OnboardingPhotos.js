import {launchImageLibrary} from 'react-native-image-picker';
import {styles} from "../styles/HostOnboardingStyles";
import {Image, ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useEffect, useState} from "react";

const OnboardingPhotos = ({formData, updateFormData, reportValidity, markVisited}) => {
  const MIN_AMOUNT_IMAGES = 5;
  const MAX_AMOUNT_IMAGES = 10;
  const [images, setImages] = useState(formData.localImages || []);
  const [errorMessage, setErrorMessage] = useState("");
  const [canAddImage, setCanAddImage] = useState(images.length < MAX_AMOUNT_IMAGES);

  //fixme remove local images and get from formData

  const onAddImage = () => {
    const options = {
      selectionLimit: 5,
      mediaType: 'photo',
      includeBase64: true,
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.85,
    }

    launchImageLibrary(options,
        (res) => {
          if (res.errorCode) {
            console.error('ImagePicker Error: ', res.errorMessage);
          } else {
            if (images.length < MAX_AMOUNT_IMAGES) {
              setImages(prevImages => [...prevImages, res]);
            }
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

      const imagesBase64 = [];
      images.forEach(image => {
        const base64Data = image.base64;
        const mimeType = image.type;
        const dataUri = `data:${mimeType};base64,${base64Data}`;

        imagesBase64.push({
          key: image.fileName,
          image: dataUri
        })
      })

      updateFormData((draft) => {
        draft.propertyImages = imagesBase64;
      })
    }

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
            <TranslatedText textToTranslate={`A minimum of ${MIN_AMOUNT_IMAGES} photos (max. ${MAX_AMOUNT_IMAGES} photos). \nClick a photo to remove it.`}/>
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