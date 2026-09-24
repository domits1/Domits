import { useEffect, useMemo, useRef, useState } from "react";
import { Auth } from "aws-amplify";
import { confirmEmailChange } from "../features/guestdashboard/emailSettings";
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
  formatDateOfBirthValue,
  validateDateOfBirth,
  formatBirthdateForStorage,
  formatBirthdateForDisplay,
  validateName,
  validateNationality,
} from "../components/settings/utils/settingsFormatters";

const SAFE_EMAIL_REGEX = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

export default function useUserProfile() {
  const [tempUser, setTempUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
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
    firstName: "",
    lastName: "",
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
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [authStatus, setAuthStatus] = useState({
    emailVerified: false,
    phoneVerified: false,
    preferredMFA: "NOMFA",
  });
  const pendingEmailRef = useRef("");

  const countryOptions = useMemo(() => countryList().getLabels(), []);
  const placeOfBirthOptions = useMemo(() => {
    if (user.placeOfBirth && !countryOptions.includes(user.placeOfBirth)) {
      return [user.placeOfBirth, ...countryOptions];
    }
    return countryOptions;
  }, [countryOptions, user.placeOfBirth]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTempUser((prev) => ({ ...prev, [name]: value }));
    if (name === "nationality" && nationalityError) {
      setNationalityError("");
    }
    if (name === "email" && emailError) {
      setEmailError("");
    }
    if (name === "email" && emailSuccess) {
      setEmailSuccess(false);
    }
    if ((name === "firstName" || name === "lastName") && nameError) {
      setNameError("");
    }
  };

  const handleDateOfBirthChange = (date) => {
    setTempUser((prev) => ({ ...prev, dateOfBirth: formatDateOfBirthValue(date) }));
    if (dateOfBirthError) {
      setDateOfBirthError("");
    }
  };

  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTempUser((prevState) => ({ ...prevState, title: value }));
  };

  const handleSexChange = (e) => {
    const value = e.target.value;
    setTempUser((prevState) => ({ ...prevState, sex: value }));
  };

  const saveUserTitle = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(currentUser, { "custom:title": tempUser.title || "" });
      setUser((prev) => ({ ...prev, title: tempUser.title }));
      return true;
    } catch (error) {
      console.error("Error updating title:", error);
      alert("Failed to update title. Please try again.");
      return false;
    }
  };

  const saveUserSex = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(currentUser, { gender: tempUser.sex || "" });
      setUser((prev) => ({ ...prev, sex: tempUser.sex }));
      return true;
    } catch (error) {
      console.error("Error updating gender:", error);
      alert("Failed to update gender. Please try again.");
      return false;
    }
  };

  const handleCountryCodeChange = (e) => {
    setSelectedCountryCode(e.target.value);
  };

  const handlePhoneChange = (e) => {
    setStripPhone(e.target.value);
    if (phoneError) {
      setPhoneError("");
    }
  };

  const handleVerificationInputChange = (e) => {
    setVerificationCode(e.target.value);
  };

  const toggleEditState = (field) => {
    if (field === "phone" && !editState.phone) {
      const phone = user.phone || "";
      const matchingCountryCode = [...countryCodes]
        .sort((a, b) => b.code.length - a.code.length)
        .find(({ code }) => phone.startsWith(code));
      const countryCode = matchingCountryCode ? matchingCountryCode.code : "+1";
      const strippedPhone = phone.startsWith(countryCode) ? phone.slice(countryCode.length).trim() : phone.trim();

      setSelectedCountryCode(countryCode);
      setTempUser((prevState) => ({ ...prevState, phone: strippedPhone }));
      setStripPhone(strippedPhone);
    }

    setEditState((prevState) => ({ ...prevState, [field]: !prevState[field] }));
    setIsVerifying(false);
    if (!editState[field] && field !== "phone") {
      setTempUser((prev) => ({ ...prev, [field]: user[field] }));
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
  const showEmailSuccess = () => {
    setEmailSuccess(true);
    setTimeout(() => setEmailSuccess(false), 2500);
  };

  const handleEmailVerification = async () => {
    try {
      const result = await confirmEmailChange(verificationCode);

      if (!result.success) {
        setEmailError("Incorrect verification code.");
        return false;
      }

      setUser((prev) => ({
        ...prev,
        email: pendingEmailRef.current,
      }));

      if (editState.email) {
        toggleEditState("email");
      }

      setIsVerifying(false);
      setEmailError("");
      showEmailSuccess();
      return true;
    } catch (error) {
      console.error("Error confirming email change:", error);
      setEmailError("An error occurred during verification. Please try again.");
      return false;
    }
  };

  const saveUserEmail = async () => {
    if (isVerifying) {
      return await handleEmailVerification();
    }

    const newEmail = tempUser.email?.trim();

    if (!newEmail || newEmail.length > 320 || !SAFE_EMAIL_REGEX.test(newEmail)) {
      setEmailError("Please provide a valid email address.");
      return false;
    }

    setEmailError("");
    setEmailSuccess(false);

    try {
      const userInfo = await Auth.currentAuthenticatedUser();
      const userId = userInfo.username;

      const response = await fetch(UPDATE_EMAIL_ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newEmail,
        }),
      });

      const result = await response.json();

      if (result.message === "Email update successful, please verify your new email.") {
        pendingEmailRef.current = newEmail;
        setIsVerifying(true);
        // Not a completed save - the email still needs the verification code
        // entered. "pending" lets usePersonalDataSave distinguish this from a
        // real success so the Save button doesn't claim "Saved!" too early.
        return "pending";
      }

      if (result.message === "This email address is already in use.") {
        setEmailError(result.message);
        return false;
      }

      if (!response.ok) {
        console.error("Request failed with status:", response.status);
        setEmailError("Failed to update email. Please try again later.");
        return false;
      }

      console.error("Unexpected error:", result.message || "No message provided");
      setEmailError("Failed to update email. Please try again later.");
      return false;
    } catch (error) {
      console.error("Error updating email:", error);
      setEmailError("An error occurred while updating the email. Please try again later.");
      return false;
    }
  };

  const saveUserName = async () => {
    const firstName = tempUser.firstName?.trim();
    const lastName = tempUser.lastName?.trim();

    const firstNameError = validateName(tempUser.firstName || "", { fieldName: "first name" });
    if (firstNameError) {
      setNameError(firstNameError);
      return false;
    }

    const lastNameError = validateName(tempUser.lastName || "", { fieldName: "last name", required: false });
    if (lastNameError) {
      setNameError(lastNameError);
      return false;
    }

    setNameError("");

    try {
      const userInfo = await Auth.currentAuthenticatedUser();
      const userId = userInfo.username;
      const newName = `${firstName} ${lastName}`.trim();
      const response = await fetch(UPDATE_NAME_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newName, firstName, lastName }),
      });

      const result = await response.json();

      if (result.statusCode === 200) {
        const currentUser = await Auth.currentAuthenticatedUser();
        await Auth.updateUserAttributes(currentUser, {
          given_name: firstName,
          family_name: lastName,
        });
        setUser((prev) => ({ ...prev, firstName, lastName }));
        if (editState.name) toggleEditState("name");
        return true;
      }

      setNameError("Failed to update name. Please try again.");
      return false;
    } catch (error) {
      console.error("Error updating username:", error);
      setNameError("Failed to update name. Please try again.");
      return false;
    }
  };

  const saveUserPhone = async () => {
    const trimmedPhone = stripPhone?.trim();
    if (!trimmedPhone) {
      setPhoneError("Please enter a phone number.");
      return false;
    }
    if (!/^[\d\s-]+$/.test(trimmedPhone)) {
      setPhoneError("Phone number may only contain digits, spaces, or hyphens.");
      return false;
    }
    const digitCount = trimmedPhone.replaceAll(/[\s-]/g, "").length;
    if (digitCount < 4 || digitCount > 13) {
      setPhoneError("Phone number must be between 4 and 13 digits.");
      return false;
    }

    setPhoneError("");

    try {
      const userInfo = await Auth.currentAuthenticatedUser();
      const userId = userInfo.username;
      const newPhone = `${selectedCountryCode}${trimmedPhone}`;

      const response = await fetch(UPDATE_PHONE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPhone }),
      });

      const result = await response.json();

      if (result.statusCode === 200) {
        setUser((prev) => ({ ...prev, phone: newPhone }));
        if (editState.phone) toggleEditState("phone");
        return true;
      }

      setPhoneError("Failed to update phone number. Please try again.");
      return false;
    } catch (error) {
      console.error("Error updating phone number:", error);
      setPhoneError("Failed to update phone number. Please try again.");
      return false;
    }
  };

  const saveUserDateOfBirth = async () => {
    const error = validateDateOfBirth(tempUser.dateOfBirth);
    if (error) {
      setDateOfBirthError(error);
      return false;
    }

    const birthdateForStorage = formatBirthdateForStorage(tempUser.dateOfBirth);

    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(currentUser, { birthdate: birthdateForStorage });
      setUser((prev) => ({ ...prev, dateOfBirth: tempUser.dateOfBirth }));
      if (editState.dateOfBirth) toggleEditState("dateOfBirth");
      return true;
    } catch (error) {
      console.error("Error updating birthdate:", error);
      setDateOfBirthError("Failed to update birthdate. Please try again.");
      return false;
    }
  };

  const saveUserPlaceOfBirth = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(currentUser, { "custom:place_of_birth": tempUser.placeOfBirth });
      setUser((prev) => ({ ...prev, placeOfBirth: tempUser.placeOfBirth }));
      if (editState.placeOfBirth) toggleEditState("placeOfBirth");
      return true;
    } catch (error) {
      console.error("Error updating place of birth:", error);
      alert("Failed to update place of birth. Please try again.");
      return false;
    }
  };

  const saveUserNationality = async () => {
    const error = validateNationalityField(tempUser.nationality || "");
    if (error) {
      setNationalityError(error);
      return false;
    }

    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      await Auth.updateUserAttributes(currentUser, { "custom:nationality": tempUser.nationality.trim() });
      setUser((prev) => ({ ...prev, nationality: tempUser.nationality.trim() }));
      if (editState.nationality) toggleEditState("nationality");
      return true;
    } catch (error) {
      console.error("Error updating nationality:", error);
      setNationalityError("Failed to update nationality. Please try again.");
      return false;
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
      const displayDob = formatBirthdateForDisplay(attributes.birthdate || "");
      setUser({
        email: attributes.email,
        firstName: attributes["given_name"] || "",
        lastName: attributes["family_name"] || "",
        address: attributes.address,
        phone: attributes.phone_number,
        family: "2 adults - 2 kids",
        title: attributes["custom:title"] || "",
        dateOfBirth: displayDob,
        placeOfBirth: attributes["custom:place_of_birth"] || "",
        sex: attributes.gender || "",
        picture: attributes.picture || "",
        nationality: attributes["custom:nationality"] || "",
      });
      setTempUser({
        email: attributes.email || "",
        firstName: attributes["given_name"] || "",
        lastName: attributes["family_name"] || "",
        phone: attributes.phone_number || "",
        title: attributes["custom:title"] || "",
        dateOfBirth: displayDob,
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
    const phone = user.phone || "";
    const matchingCode = [...countryCodes]
      .sort((a, b) => b.code.length - a.code.length)
      .find(({ code }) => phone.startsWith(code));
    const countryCode = matchingCode ? matchingCode.code : "+1";
    setSelectedCountryCode(countryCode);
    setStripPhone(phone.startsWith(countryCode) ? phone.slice(countryCode.length).trim() : phone.trim());
  }, [user.phone]);

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
    emailError,
    nameError,
    phoneError,
    emailSuccess,
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
    onKeyPressName: (e) => {
      if (e.key === "Enter") saveUserName();
    },
    onKeyPressEmail: (e) => {
      if (e.key === "Enter") saveUserEmail();
    },
    onKeyPressPhone: (e) => {
      if (e.key === "Enter") saveUserPhone();
    },
    onKeyPressDateOfBirth: (e) => {
      if (e.key === "Enter") saveUserDateOfBirth();
    },
    onKeyPressNationality: (e) => {
      if (e.key === "Enter") saveUserNationality();
    },
    onSaveUserName: saveUserName,
    onSaveUserEmail: saveUserEmail,
    onSaveUserPhone: saveUserPhone,
    onSaveUserDateOfBirth: saveUserDateOfBirth,
    onSaveUserPlaceOfBirth: saveUserPlaceOfBirth,
    onSaveUserNationality: saveUserNationality,
    onSaveUserTitle: saveUserTitle,
    onSaveUserSex: saveUserSex,
    onToggleEditState: toggleEditState,
  };
}
