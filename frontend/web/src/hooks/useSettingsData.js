import { useState } from "react";

const useSettingsData = () => {
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    sex: "",
    dateOfBirth: "",
    placeOfBirth: "",
    nationality: "",
    picture: ""
  });

  const [tempUser, setTempUser] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    sex: "",
    dateOfBirth: "",
    placeOfBirth: "",
    nationality: "",
    picture: ""
  });

  const [preferences, setPreferences] = useState({
    language: "en",
    dateFormat: "DD-MM-YYYY",
    priceFormat: "EUR"
  });

  const [ui, setUI] = useState({
    isUploadingPhoto: false,
    photoError: "",
    dateOfBirthError: "",
    nationalityError: "",
    isVerifying: false,
    verificationCode: ""
  });

  const [options] = useState({
    titleOptions: ["", "Mr", "Ms", "Mrs"],
    sexOptions: ["", "Male", "Female", "Other"],
    placeOfBirthOptions: [],
    countryCodes: [],
    languageOptions: [
      { value: "en", label: "English" }
    ],
    dateFormatOptions: [
      { value: "DD-MM-YYYY", label: "DD-MM-YYYY" }
    ],
    priceFormatOptions: [
      { value: "EUR", label: "EUR (€)" }
    ]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempUser((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e) => {
    const { value } = e.target;
    setTempUser((prev) => ({
      ...prev,
      phone: value
    }));
  };

  const handleCountryCodeChange = () => {};

  const handleSave = async () => {
    try {
      setUser(tempUser);
    } catch (err) {
      console.error(err);
    }
  };

  return {
    user,
    tempUser,

    selectedCountryCode: "",
    stripPhone: tempUser.phone,

    language: preferences.language,
    dateFormat: preferences.dateFormat,
    priceFormat: preferences.priceFormat,

    ...ui,
    ...options,

    onInputChange: handleChange,
    onPhoneChange: handlePhoneChange,
    onCountryCodeChange: handleCountryCodeChange,

    onTitleChange: handleChange,
    onSexChange: handleChange,
    onDateOfBirthChange: handleChange,

    onVerificationInputChange: handleChange,

    onKeyPressName: () => {},
    onKeyPressEmail: () => {},
    onKeyPressPhone: () => {},
    onKeyPressDateOfBirth: () => {},
    onKeyPressNationality: () => {},

    onPhotoButtonClick: () => {},
    onPhotoRemove: () => {},
    onPhotoInputChange: () => {},

    onLanguageChange: () => {},
    onDateFormatChange: () => {},
    onPriceFormatChange: () => {},

    onSaveUserName: handleSave,
    onSaveUserEmail: handleSave,
    onSaveUserPhone: handleSave,
    onSaveUserDateOfBirth: handleSave,
    onSaveUserPlaceOfBirth: handleSave,
    onSaveUserNationality: handleSave,

    onToggleEditState: () => {}
  };
};

export default useSettingsData;