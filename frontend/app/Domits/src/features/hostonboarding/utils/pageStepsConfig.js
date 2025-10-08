import OnboardingType from "../views/OnboardingType";
import OnboardingSpace from "../views/onboardingspacetype/screens/OnboardingSpace";
import OnboardingName from "../views/OnboardingName";
import OnboardingLocation from "../views/OnboardingLocation";
import OnboardingDescription from "../views/OnboardingDescription";
import OnboardingAmountOfGuests from "../views/OnboardingAmountOfGuests";
import OnboardingAmenities from "../views/OnboardingAmenities";
import OnboardingHouseRules from "../views/OnboardingHouseRules";

export const steps = [
    { key: 'propertyType', title: 'Property Type', component: OnboardingType },
    { key: 'propertySpace', title: 'Property Spacing', component: OnboardingSpace },
    { key: 'propertyName', title: 'Property Name', component: OnboardingName },
    { key: 'propertyLocation', title: 'Property Location', component: OnboardingLocation},
    { key: 'propertyDescription', title: 'Property Description', component: OnboardingDescription},
    { key: 'propertyAmountOfGuests', title: 'Amount of Guests', component: OnboardingAmountOfGuests},
    { key: 'propertyAmenities', title: 'Property Amenity', component: OnboardingAmenities},
    { key: 'propertyHouseRules', title: 'House Rules', component:OnboardingHouseRules}
];
