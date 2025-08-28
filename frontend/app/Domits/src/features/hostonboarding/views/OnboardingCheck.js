import {Text, View} from "react-native";
import {styles} from "../styles/HostOnboardingStyles";
import TranslatedText from "../../translation/components/TranslatedText";

const OnboardingCheck = ({route}) => {
  const { formData } = route.params;

  return (
      <View>
        <View>
          <Text style={styles.onboardingPageTitle}>
            <TranslatedText textToTranslate={'Overview'}/>
          </Text>
          <Text style={styles.onboardingPageDescription}>
            <TranslatedText textToTranslate={'Review your property details.'}/>
          </Text>
        </View>
        <View>
          <Text>
            <TranslatedText textToTranslate={'Space'}/>
          </Text>
          <Text>
            <TranslatedText textToTranslate={formData.propertyType.property_type}/>
          </Text>
        </View>
      </View>
  )
}

export default OnboardingCheck;