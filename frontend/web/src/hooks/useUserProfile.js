import {useEffect, useMemo, useRef, useState} from "react";
import {Auth} from "aws-amplify";
import {confirmEmailChange} from "../features/guestdashboard/emailSettings";
import countryList from "react-select-country-list";
import {
    UPDATE_EMAIL_ENDPOINT,
    UPDATE_NAME_ENDPOINT,
    UPDATE_PHONE_ENDPOINT,
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

const SAFE_EMAIL_REGEX = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

export default function useUserProfile() {
    const [tempUser, setTempUser] = useState({
        email: "",
        name: "",
        phone: "",
        title: "",
        dateOfBirth: "",
        placeOfBirth: "",
        sex: "",
        picture: "",
        nationality: "",
    });
    const [user, setUser] = useState({
        email: "",
        name: "",
        address: "",
        phone: "",
        family: "",
        title: "",
        dateOfBirth: "",
        placeOfBirth: "",
        sex: "",
        picture: "",
        nationality: "",
    });
    const [editState, setEditState] = useState({
        email: false,
        name: false,
        phone: false,
        dateOfBirth: false,
        placeOfBirth: false,
        nationality: false,
    });
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
    const [stripPhone, setStripPhone] = useState("");
    const [dateOfBirthError, setDateOfBirthError] = useState("");
    const [nationalityError, setNationalityError] = useState("");
    const [authStatus, setAuthStatus] = useState({
        emailVerified: false,
        phoneVerified: false,
        preferredMFA: "NOMFA",
    });
    const previousDobRef = useRef("");

    const countryOptions = useMemo(() => countryList().getLabels(), []);
    const placeOfBirthOptions = useMemo(() => {
        if (user.placeOfBirth && !countryOptions.includes(user.placeOfBirth)) {
            return [user.placeOfBirth, ...countryOptions];
        }
        return countryOptions;
    }, [countryOptions, user.placeOfBirth]);

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setTempUser((prev) => ({...prev, [name]: value}));
        if (name === "nationality" && nationalityError) {
            setNationalityError("");
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
        setTempUser((prev) => ({...prev, dateOfBirth: formatted}));
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
            await Auth.updateUserAttributes(currentUser, {"custom:title": value || ""});
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
            await Auth.updateUserAttributes(currentUser, {gender: value});
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
        if (field === "phone" && !editState.phone) {
            const phone = user.phone || "";
            const matchingCountryCode = [...countryCodes]
                .sort((a, b) => b.code.length - a.code.length)
                .find(({code}) => phone.startsWith(code));
            const countryCode = matchingCountryCode ? matchingCountryCode.code : "+1";
      const strippedPhone = phone.startsWith(countryCode)
        ? phone.slice(countryCode.length).trim()
        : phone.trim();

            setSelectedCountryCode(countryCode);
            setTempUser((prevState) => ({...prevState, phone: strippedPhone}));
            setStripPhone(strippedPhone);
        }

        setEditState((prevState) => ({...prevState, [field]: !prevState[field]}));
        setIsVerifying(false);
        if (!editState[field] && field !== "phone") {
            setTempUser((prev) => ({...prev, [field]: user[field]}));
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
                    toggleEditState("email");
                } else {
                    alert("Incorrect verification code");
                }
            } catch (error) {
                console.error("Error confirming email change:", error);
                alert("An error occurred during verification. Please try again.");
            }
            return;
        }

        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newEmail = tempUser.email?.trim();

            if (!newEmail || newEmail.length > 320 || !SAFE_EMAIL_REGEX.test(newEmail)) {
                alert("Please provide a valid email address.");
                return;
            }

            const response = await fetch(UPDATE_EMAIL_ENDPOINT, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({userId, newEmail}),
            });

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
        const newName = tempUser.name?.trim();
        if (!newName) {
            alert("Please provide a valid name.");
            return;
        }

        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const response = await fetch(UPDATE_NAME_ENDPOINT, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({userId, newName}),
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                setUser({...user, name: newName});
                toggleEditState("name");
            }
        } catch (error) {
            console.error("Error updating username:", error);
            alert("Failed to update name. Please try again.");
        }
    };

    const saveUserPhone = async () => {
        const trimmedPhone = stripPhone?.trim();
        if (!trimmedPhone) {
            alert("Please enter a phone number.");
            return;
        }
      if (!/^[\d\s-]+$/.test(trimmedPhone)) {
            alert("Phone number may only contain digits, spaces, or hyphens.");
            return;
        }
      const digitCount = trimmedPhone.replaceAll(/[\s-]/g, "").length;
        if (digitCount < 4 || digitCount > 13) {
            alert("Phone number must be between 4 and 13 digits.");
            return;
        }

        try {
            const userInfo = await Auth.currentAuthenticatedUser();
            const userId = userInfo.username;
            const newPhone = `${selectedCountryCode}${trimmedPhone}`;

            const response = await fetch(UPDATE_PHONE_ENDPOINT, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({userId, newPhone}),
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                setUser({...user, phone: newPhone});
                toggleEditState("phone");
            } else {
                alert("Failed to update phone number. Please try again.");
            }
        } catch (error) {
            console.error("Error updating phone number:", error);
            alert("Failed to update phone number. Please try again.");
            alert("Failed to update phone number. Please try again.");
        }
    };

    const saveUserDateOfBirth = async () => {
        const error = validateDateOfBirth(tempUser.dateOfBirth);
        if (error) {
            setDateOfBirthError(error);
            return;
        }

        const birthdateForStorage = formatBirthdateForStorage(tempUser.dateOfBirth);

        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, {birthdate: birthdateForStorage});
            setUser({...user, dateOfBirth: tempUser.dateOfBirth});
            toggleEditState("dateOfBirth");
        } catch (error) {
            console.error("Error updating birthdate:", error);
            alert("Failed to update birthdate. Please try again.");
        }
    };

    const saveUserPlaceOfBirth = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            await Auth.updateUserAttributes(currentUser, {"custom:place_of_birth": tempUser.placeOfBirth});
            setUser({...user, placeOfBirth: tempUser.placeOfBirth});
            toggleEditState("placeOfBirth");
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
            await Auth.updateUserAttributes(currentUser, {"custom:nationality": tempUser.nationality.trim()});
            setUser({...user, nationality: tempUser.nationality.trim()});
            toggleEditState("nationality");
        } catch (error) {
            console.error("Error updating nationality:", error);
            setNationalityError("Failed to update nationality. Please try again.");
        }
    };

    const fetchUserData = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser({bypassCache: true});
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
                name: attributes["given_name"],
                address: attributes.address,
                phone: attributes.phone_number,
                family: "2 adults - 2 kids",
                title: attributes["custom:title"] || "",
                dateOfBirth: formatBirthdateForDisplay(attributes.birthdate || ""),
                placeOfBirth: attributes["custom:place_of_birth"] || "",
                sex: attributes.gender || "",
                picture: attributes.picture || "",
                nationality: attributes["custom:nationality"] || "",
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

    useEffect(() => {
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
        setUser,
        tempUser,
        editState,
        verificationCode,
        isVerifying,
        selectedCountryCode,
        stripPhone,
        dateOfBirthError,
        nationalityError,
        authStatus,
        placeOfBirthOptions,
        countryCodes,
        titleOptions,
        sexOptions,
        onInputChange: handleInputChange,
        onVerificationInputChange: handleVerificationInputChange,
        onCountryCodeChange: handleCountryCodeChange,
        onPhoneChange: handlePhoneChange,
        onTitleChange: handleTitleChange,
        onSexChange: handleSexChange,
        onDateOfBirthChange: handleDateOfBirthChange,
        onKeyPressName: (e) => {if (e.key === "Enter") saveUserName();},
        onKeyPressEmail: (e) => {if (e.key === "Enter") saveUserEmail();},
        onKeyPressPhone: (e) => {if (e.key === "Enter") saveUserPhone();},
        onKeyPressDateOfBirth: (e) => {if (e.key === "Enter") saveUserDateOfBirth();},
        onKeyPressNationality: (e) => {if (e.key === "Enter") saveUserNationality();},
        onSaveUserName: saveUserName,
        onSaveUserEmail: saveUserEmail,
        onSaveUserPhone: saveUserPhone,
        onSaveUserDateOfBirth: saveUserDateOfBirth,
        onSaveUserPlaceOfBirth: saveUserPlaceOfBirth,
        onSaveUserNationality: saveUserNationality,
        onToggleEditState: toggleEditState,
    };
}
