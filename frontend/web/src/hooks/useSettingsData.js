import useUserProfile from "./useUserProfile";
import usePhotoUpload from "./usePhotoUpload";
import usePreferences from "./usePreferences";
import usePasswordChange from "./usePasswordChange";

export default function useSettingsData() {
    const {setUser, ...profile} = useUserProfile();
    const photo = usePhotoUpload(setUser);
    const preferences = usePreferences();
    const passwordChange = usePasswordChange();

    return {
        ...profile,
        ...photo,
        ...preferences,
        ...passwordChange,
    };
}
