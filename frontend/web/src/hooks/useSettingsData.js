import {useContext, useEffect, useMemo, useRef, useState} from "react";
import {API, graphqlOperation, Auth} from "aws-amplify";
import {confirmEmailChange} from "../features/guestdashboard/emailSettings";
import {LanguageContext} from "../context/LanguageContext";
import countryList from "react-select-country-list";

import {
    PROFILE_PHOTO_MAX_SIZE,
    languageOptions,
    dateFormatOptions,
    priceFormatOptions,
    countryCodes,
    titleOptions,
    sexOptions,
} from "../components/settings/constants";
import {
    normalizePreferredMfa,
    formatDateOfBirth,
    validateDateOfBirth,
    formatBirthdateForStorage,
    formatBirthdateForDisplay,
    validateNationality,
} from "../components/settings/utils/settingsFormatters";
import {getProfileUploadUrl} from "../components/settings/api/profileUpload";

const listAccommodationsQuery = /* GraphQL */ `
    query ListAccommodations {
        listAccommodations {
            items {
                id
            }
        }
    }
`;

export default function useSettingsData() {
    const {language, setLanguage} = useContext(LanguageContext);

    const [tempUser, setTempUser] = useState({
        email: '',
        name: '',
        phone: '',
        title: '',
        dateOfBirth: '',
        placeOfBirth: '',
        sex: '',
        picture: '',
        nationality: '',
    });
    const [user, setUser] = useState({
        email: '',
        name: '',
        address: '',
        phone: '',
        family: '',
        title: '',
        dateOfBirth: '',
        placeOfBirth: '',
        sex: '',
        picture: '',
        nationality: '',
    });
    const [editState, setEditState] = useState({
        email: false,
        name: false,
        phone: false,
        dateOfBirth: false,
        placeOfBirth: false,
        nationality: false,
    });
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
    const [stripPhone, setStripPhone] = useState("");
    const [dateOfBirthError, setDateOfBirthError] = useState("");
    const [photoError, setPhotoError] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [nationalityError, setNationalityError] = useState("");
    const [authStatus, setAuthStatus] = useState({
        emailVerified: false,
        phoneVerified: false,
        preferredMFA: "NOMFA",
    });
    const [dateFormat, setDateFormat] = useState(localStorage.getItem("dateFormat") || "en");
    const [priceFormat, setPriceFormat] = useState(localStorage.getItem("priceFormat") || "usd");
    const previousDobRef = useRef("");
    const photoInputRef = useRef(null);

    const countryOptions = useMemo(() => countryList().getLabels(), []);
    const placeOfBirthOptions = useMemo(() => {
        if (user.placeOfBirth && !countryOptions.includes(user.placeOfBirth)) {
            return [user.placeOfBirth, ...countryOptions];
        }
        return countryOptions;
    }, [countryOptions, user.placeOfBirth]);

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setTempUser({...tempUser, [name]: value});
        if (name === "nationality" && nationalityError) {
            setNationalityError("");
        }
    };

    const handleLanguageChange = (e) => {
        setLanguage(e.target.value);
    };

    const handleDateFormatChange = (e) => {
        const value = e.target.value;
        setDateFormat(value);
        localStorage.setItem("dateFormat", value);
    };

    const handlePriceFormatChange = (e) => {
        const value = e.target.value;
        setPriceFormat(value);
        localStorage.setItem("priceFormat", value);
    };

    const handlePhotoButtonClick = () => {
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
            photoInputRef.current.click();
        }
    };

    const handlePhotoInputChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoError("Please select an image file.");
            return;
        }

        if (file.size > PROFILE_PHOTO_MAX_SIZE) {
            setPhotoError("Image must be 5MB or smaller.");
            return;
        }

        setIsUploadingPhoto(true);
        setPhotoError("");

        try {
            const uploadData = await getProfileUploadUrl(file.type);

            if (!uploadData.uploadUrl || !uploadData.fields || !uploadData.fileUrl) {
                throw new Error("Invalid upload response.");
            }

            const formData = new FormData();
            Object.entries(uploadData.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
            formData.append("file", file);

            const uploadResponse = await fetch(uploadData.uploadUrl, {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image.");
            }

            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { picture: uploadData.fileUrl });
            setUser((prevState) => ({
                ...prevState,
                picture: uploadData.fileUrl,
            }));
        } catch (error) {
            console.error("Error uploading profile photo:", error);
            setPhotoError("Failed to upload photo. Please try again.");
        } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) {
                photoInputRef.current.value = "";
            }
        }
    };

    const handlePhotoRemove = async () => {
        if (!user.picture) return;

        setIsUploadingPhoto(true);
        setPhotoError("");

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { picture: "" });
            setUser((prevState) => ({
                ...prevState,
                picture: "",
            }));
        } catch (error) {
            console.error("Error removing profile photo:", error);
            setPhotoError("Failed to remove photo. Please try again.");
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleDateOfBirthChange = (e) => {
        const digits = e.target.value.replaceAll(/\D/g, "").slice(0, 8);
        const prevValue = previousDobRef.current || "";
        const prevDigits = prevValue.replaceAll(/\D/g, "");
        const isDeleting = e.target.value.length < prevValue.length;
        let nextDigits = digits;

        if (isDeleting && prevDigits.length === digits.length) {
            const cursor = e.target.selectionStart ?? e.target.value.length;
            if (prevValue[cursor] === "-") {
                const digitsBefore = prevValue.slice(0, cursor).replaceAll(/\D/g, "").length;
                const removeIndex = Math.max(digitsBefore - 1, 0);
                nextDigits = prevDigits.slice(0, removeIndex) + prevDigits.slice(removeIndex + 1);
            }
        }

        const formatted = formatDateOfBirth(nextDigits);
        previousDobRef.current = formatted;
        setTempUser({...tempUser, dateOfBirth: formatted});
        if (dateOfBirthError) {
            setDateOfBirthError("");
        }
    };

    const handleTitleChange = async (e) => {
        const value = e.target.value;
        if (value === user.title) return;
        setTempUser((prevState) => ({...prevState, title: value}));
        setUser((prevState) => ({...prevState, title: value}));
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { "custom:title": value || "" });
        } catch (error) {
            console.error("Error updating title:", error);
            alert("Failed to update title. Please try again.");
        }
    };

    const handleSexChange = async (e) => {
        const value = e.target.value;
        setTempUser((prevState) => ({...prevState, sex: value}));
        setUser((prevState) => ({...prevState, sex: value}));

        if (!value) return;

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { gender: value });
        } catch (error) {
            console.error("Error updating gender:", error);
            alert("Failed to update gender. Please try again.");
        }
    };

    const handleCountryCodeChange = (e) => {
        setSelectedCountryCode(e.target.value);
    };

    const handlePhoneChange = (e) => {
        setStripPhone(e.target.value);
    };

    const handleVerificationInputChange = (e) => {
        setVerificationCode(e.target.value);
    };

    const toggleEditState = (field) => {
        if (field === 'phone' && !editState.phone) {
            const phone = user.phone || "";
            const matchingCountryCode = countryCodes.find(({code}) =>
                phone.startsWith(code)
            );
            const countryCode = matchingCountryCode ? matchingCountryCode.code : "+1";
            const strippedPhone = phone.replace(countryCode, '').trim();

            setSelectedCountryCode(countryCode);
            setTempUser((prevState) => ({
                ...prevState,
                phone: strippedPhone,
            }));
            setStripPhone(strippedPhone);
        }

        setEditState((prevState) => ({...prevState, [field]: !prevState[field]}));
        setIsVerifying(false);
        if (!editState[field]) {
            setTempUser({...tempUser, [field]: user[field]});
        }
        if (field === "dateOfBirth") {
            setDateOfBirthError("");
        }
        if (field === "nationality") {
            setNationalityError("");
        }
    };

    const validateNationalityField = (value) => {
        const trimmed = value.trim();
        const current = (user.nationality || "").trim();
        if (trimmed === current) return "";
        return validateNationality(value);
    };

    const saveUserEmail = async () => {
        if (isVerifying) {
            try {
                const result = await confirmEmailChange(verificationCode);
                if (result.success) {
                    setUser({...user, email: tempUser.email});
                    toggleEditState('email');
                } else {
                    alert("Incorrect verification code");
                }
            } catch (error) {
                alert("An error occurred during verification. Please try again.");
            }
            return;
        }

        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newEmail = tempUser.email;

            if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
                alert("Please provide a valid email address.");
                return;
            }

            const params = {
                userId,
                newEmail,
            };

            const response = await fetch(
                'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-CustomerIAM-Production-Update-UserEmail',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(params),
                }
            );

            const result = await response.json();

            if (response.ok) {
                if (result.message === "Email update successful, please verify your new email.") {
                    setIsVerifying(true);
                } else if (result.message === "This email address is already in use.") {
                    alert(result.message);
                } else {
                    console.error("Unexpected error:", result.message || "No message provided");
                }
            } else {
                console.error("Request failed with status:", response.status);
                alert("Failed to update email. Please try again later.");
            }
        } catch (error) {
            console.error("Error updating email:", error);
            alert("An error occurred while updating the email. Please try again later.");
        }
    };

    const saveUserName = async () => {
        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newName = tempUser.name;

            const params = {
                userId,
                newName
            };

            const response = await fetch('https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-UserName', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                setUser({...user, name: tempUser.name});
                toggleEditState('name');
            }
        } catch (error) {
            console.error("Error updating username:", error);
        }
    };

    const saveUserPhone = async () => {
        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newPhone = `${selectedCountryCode}${stripPhone}`;

            const params = {
                userId,
                newPhone
            };

            const response = await fetch('https://24oly7cicg.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-PhoneNumber', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                setUser({...user, phone: newPhone});
                toggleEditState('phone');
            }
        } catch (error) {
            console.error("Error updating phone number:", error);
        }
    };

    const handleKeyPressEmail = (e) => {
        if (e.key === 'Enter') {
            saveUserEmail();
        }
    };

    const handleKeyPressName = (e) => {
        if (e.key === 'Enter') {
            saveUserName();
        }
    };

    const handleKeyPressPhone = (e) => {
        if (e.key === 'Enter') {
            saveUserPhone();
        }
    };

    const saveUserDateOfBirth = async () => {
        const error = validateDateOfBirth(tempUser.dateOfBirth);
        if (error) {
            setDateOfBirthError(error);
            return;
        }

        const birthdateForStorage = formatBirthdateForStorage(tempUser.dateOfBirth);
        setUser({...user, dateOfBirth: tempUser.dateOfBirth});
        toggleEditState('dateOfBirth');

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { birthdate: birthdateForStorage });
        } catch (error) {
            console.error("Error updating birthdate:", error);
            alert("Failed to update birthdate. Please try again.");
        }
    };

    const saveUserPlaceOfBirth = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { "custom:place_of_birth": tempUser.placeOfBirth });
            setUser({...user, placeOfBirth: tempUser.placeOfBirth});
            toggleEditState('placeOfBirth');
        } catch (error) {
            console.error("Error updating place of birth:", error);
            alert("Failed to update place of birth. Please try again.");
        }
    };

    const saveUserNationality = async () => {
        const error = validateNationalityField(tempUser.nationality || "");
        if (error) {
            setNationalityError(error);
            return;
        }

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, { "custom:nationality": tempUser.nationality.trim() });
            setUser({...user, nationality: tempUser.nationality.trim()});
            toggleEditState('nationality');
        } catch (error) {
            console.error("Error updating nationality:", error);
            setNationalityError("Failed to update nationality. Please try again.");
        }
    };

    const handleKeyPressDateOfBirth = (e) => {
        if (e.key === 'Enter') {
            saveUserDateOfBirth();
        }
    };

    const handleKeyPressNationality = (e) => {
        if (e.key === 'Enter') {
            saveUserNationality();
        }
    };

    const fetchUserData = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
            const attributes = currentUser?.attributes || {};
            let preferredMFA = "NOMFA";
            try {
                preferredMFA = normalizePreferredMfa(await Auth.getPreferredMFA(currentUser));
            } catch (error) {
                console.warn("Unable to load preferred MFA:", error);
            }
            const emailVerified = attributes.email_verified === true || attributes.email_verified === "true";
            const phoneVerified = attributes.phone_number_verified === true || attributes.phone_number_verified === "true";
            setUser({
                email: attributes.email,
                name: attributes['given_name'],
                address: attributes.address,
                phone: attributes.phone_number,
                family: "2 adults - 2 kids",
                title: attributes["custom:title"] || '',
                dateOfBirth: formatBirthdateForDisplay(attributes.birthdate || ''),
                placeOfBirth: attributes["custom:place_of_birth"] || '',
                sex: attributes.gender || '',
                picture: attributes.picture || '',
                nationality: attributes["custom:nationality"] || '',
            });
            setAuthStatus({
                emailVerified,
                phoneVerified,
                preferredMFA,
            });
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchAccommodations = async () => {
        try {
            const response = await API.graphql(graphqlOperation(listAccommodationsQuery));
            console.log("Accommodations:", response.data.listAccommodations.items);
        } catch (error) {
            console.error("Error listing accommodations:", error);
        }
    };

    useEffect(() => {
        fetchAccommodations();
        fetchUserData();
    }, []);

    useEffect(() => {
        previousDobRef.current = tempUser.dateOfBirth || "";
    }, [tempUser.dateOfBirth]);

    useEffect(() => {
        setStripPhone(user.phone);
    }, [user]);

    return {
        user,
        tempUser,
        editState,
        verificationCode,
        isVerifying,
        selectedCountryCode,
        stripPhone,
        dateOfBirthError,
        photoError,
        isUploadingPhoto,
        nationalityError,
        authStatus,
        language,
        dateFormat,
        priceFormat,
        photoInputRef,
        languageOptions,
        dateFormatOptions,
        priceFormatOptions,
        countryCodes,
        titleOptions,
        sexOptions,
        placeOfBirthOptions,
        onPhotoButtonClick: handlePhotoButtonClick,
        onPhotoRemove: handlePhotoRemove,
        onPhotoInputChange: handlePhotoInputChange,
        onTitleChange: handleTitleChange,
        onInputChange: handleInputChange,
        onVerificationInputChange: handleVerificationInputChange,
        onKeyPressName: handleKeyPressName,
        onKeyPressEmail: handleKeyPressEmail,
        onKeyPressPhone: handleKeyPressPhone,
        onKeyPressDateOfBirth: handleKeyPressDateOfBirth,
        onKeyPressNationality: handleKeyPressNationality,
        onCountryCodeChange: handleCountryCodeChange,
        onPhoneChange: handlePhoneChange,
        onSexChange: handleSexChange,
        onDateOfBirthChange: handleDateOfBirthChange,
        onLanguageChange: handleLanguageChange,
        onDateFormatChange: handleDateFormatChange,
        onPriceFormatChange: handlePriceFormatChange,
        onSaveUserName: saveUserName,
        onSaveUserEmail: saveUserEmail,
        onSaveUserPhone: saveUserPhone,
        onSaveUserDateOfBirth: saveUserDateOfBirth,
        onSaveUserPlaceOfBirth: saveUserPlaceOfBirth,
        onSaveUserNationality: saveUserNationality,
        onToggleEditState: toggleEditState,
    };
}
