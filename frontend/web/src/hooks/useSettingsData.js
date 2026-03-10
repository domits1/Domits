import useUserProfile from "./useUserProfile";
import usePhotoUpload from "./usePhotoUpload";
import usePreferences from "./usePreferences";

export default function useSettingsData() {
    const {setUser, ...profile} = useUserProfile();
    const photo = usePhotoUpload(setUser);
    const preferences = usePreferences();

    return {
        ...profile,
        ...photo,
        ...preferences,
    };
}
