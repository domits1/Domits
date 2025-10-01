import {launchImageLibrary} from 'react-native-image-picker';
import {styles} from "../styles/HostOnboardingStyles";
import {Image, ScrollView, Text, TouchableOpacity, View} from "react-native";
import TranslatedText from "../../translation/components/TranslatedText";
import React, {useEffect, useState} from "react";

const OnboardingPhotos = ({formData, updateFormData, reportValidity, markVisited}) => {
  const [images, setImages] = useState(null);

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
            setImages(res)
          }
        }
    )
  }

  useEffect(() => {
    if (images != null) {
      console.log(images.uri)
    }
  }, [images])

  return (
      <ScrollView style={{flex: 1}}>
        <View style={styles.contentContainer}>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={"Add photos of your property/"}/>
          </Text>
          <ScrollView contentContainerStyle={styles.scrollContainer}>

            <View>
              {images != null &&
                  <Image
                      resizeMode="contain"
                      resizeMethod="scale"
                      style={styles.image}
                      source={{uri: images.uri}}/>
              }
            </View>

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