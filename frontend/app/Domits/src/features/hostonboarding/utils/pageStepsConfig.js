import OnboardingType from "../views/OnboardingType";
import OnboardingSpace from "../views/OnboardingSpace";
import OnboardingName from "../views/OnboardingName";

export const steps = [
    { key: 'propertyType', title: 'Property Type', component: OnboardingType },
    { key: 'propertySpace', title: 'Spacing', component: OnboardingSpace },
    { key: 'propertyName', title: 'Property Name', component: OnboardingName },
];
