import OnboardingType from "../views/OnboardingType";
import OnboardingSpace from "../views/onboardingspacetype/screens/OnboardingSpace";
import OnboardingName from "../views/OnboardingName";

export const steps = [
    { key: 'propertyType', title: 'Property Type', component: OnboardingType },
    { key: 'propertySpace', title: 'Property Spacing', component: OnboardingSpace },
    { key: 'propertyName', title: 'Property Name', component: OnboardingName },
];
