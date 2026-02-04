import React, {useEffect, useRef, useState} from "react";
import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";
import {API, graphqlOperation, Auth} from "aws-amplify";
import {confirmEmailChange} from "../guestdashboard/emailSettings";
import './settingshostdashboard.css';


const HostSettings = () => {
    const [tempUser, setTempUser] = useState({
        email: '',
        name: '',
        phone: '',
        title: '',
        dateOfBirth: '',
        placeOfBirth: '',
        sex: '',
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
    });
    const [editState, setEditState] = useState({
        email: false,
        name: false,
        phone: false,
        dateOfBirth: false,
        placeOfBirth: false,
    });
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerifyingUsername, setIsVerifyingUsername] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
    const [stripPhone, setStripPhone] = useState("");
    const [dateOfBirthError, setDateOfBirthError] = useState("");
    const previousDobRef = useRef("");

    const countryCodes = [
        {code: "+1", name: "United States/Canada"},
        {code: "+7", name: "Russia"},
        {code: "+20", name: "Egypt"},
        {code: "+27", name: "South Africa"},
        {code: "+30", name: "Greece"},
        {code: "+31", name: "Netherlands"},
        {code: "+32", name: "Belgium"},
        {code: "+33", name: "France"},
        {code: "+34", name: "Spain"},
        {code: "+36", name: "Hungary"},
        {code: "+39", name: "Italy"},
        {code: "+40", name: "Romania"},
        {code: "+44", name: "United Kingdom"},
        {code: "+45", name: "Denmark"},
        {code: "+46", name: "Sweden"},
        {code: "+47", name: "Norway"},
        {code: "+48", name: "Poland"},
        {code: "+49", name: "Germany"},
        {code: "+52", name: "Mexico"},
        {code: "+54", name: "Argentina"},
        {code: "+55", name: "Brazil"},
        {code: "+56", name: "Chile"},
        {code: "+57", name: "Colombia"},
        {code: "+58", name: "Venezuela"},
        {code: "+60", name: "Malaysia"},
        {code: "+61", name: "Australia"},
        {code: "+62", name: "Indonesia"},
        {code: "+63", name: "Philippines"},
        {code: "+64", name: "New Zealand"},
        {code: "+65", name: "Singapore"},
        {code: "+66", name: "Thailand"},
        {code: "+81", name: "Japan"},
        {code: "+82", name: "South Korea"},
        {code: "+84", name: "Vietnam"},
        {code: "+86", name: "China"},
        {code: "+90", name: "Turkey"},
        {code: "+91", name: "India"},
        {code: "+92", name: "Pakistan"},
        {code: "+93", name: "Afghanistan"},
        {code: "+94", name: "Sri Lanka"},
        {code: "+95", name: "Myanmar"},
        {code: "+98", name: "Iran"},
        {code: "+212", name: "Morocco"},
        {code: "+213", name: "Algeria"},
        {code: "+216", name: "Tunisia"},
        {code: "+218", name: "Libya"},
        {code: "+220", name: "Gambia"},
        {code: "+221", name: "Senegal"},
        {code: "+223", name: "Mali"},
        {code: "+225", name: "Ivory Coast"},
        {code: "+230", name: "Mauritius"},
        {code: "+234", name: "Nigeria"},
        {code: "+254", name: "Kenya"},
        {code: "+255", name: "Tanzania"},
        {code: "+256", name: "Uganda"},
        {code: "+260", name: "Zambia"},
        {code: "+263", name: "Zimbabwe"},
        {code: "+267", name: "Botswana"},
        {code: "+356", name: "Malta"},
        {code: "+358", name: "Finland"},
        {code: "+359", name: "Bulgaria"},
        {code: "+370", name: "Lithuania"},
        {code: "+371", name: "Latvia"},
        {code: "+372", name: "Estonia"},
        {code: "+373", name: "Moldova"},
        {code: "+374", name: "Armenia"},
        {code: "+375", name: "Belarus"},
        {code: "+376", name: "Andorra"},
        {code: "+380", name: "Ukraine"},
        {code: "+381", name: "Serbia"},
        {code: "+385", name: "Croatia"},
        {code: "+386", name: "Slovenia"},
        {code: "+387", name: "Bosnia and Herzegovina"},
        {code: "+389", name: "North Macedonia"},
        {code: "+420", name: "Czech Republic"},
        {code: "+421", name: "Slovakia"},
        {code: "+423", name: "Liechtenstein"},
        {code: "+500", name: "Falkland Islands"},
        {code: "+501", name: "Belize"},
        {code: "+502", name: "Guatemala"},
        {code: "+503", name: "El Salvador"},
        {code: "+504", name: "Honduras"},
        {code: "+505", name: "Nicaragua"},
        {code: "+506", name: "Costa Rica"},
        {code: "+507", name: "Panama"},
        {code: "+509", name: "Haiti"},
        {code: "+852", name: "Hong Kong"},
        {code: "+853", name: "Macau"},
        {code: "+855", name: "Cambodia"},
        {code: "+856", name: "Laos"},
        {code: "+880", name: "Bangladesh"},
        {code: "+960", name: "Maldives"},
        {code: "+961", name: "Lebanon"},
        {code: "+962", name: "Jordan"},
        {code: "+963", name: "Syria"},
        {code: "+964", name: "Iraq"},
        {code: "+965", name: "Kuwait"},
        {code: "+966", name: "Saudi Arabia"},
        {code: "+967", name: "Yemen"},
        {code: "+971", name: "United Arab Emirates"},
        {code: "+972", name: "Israel"},
        {code: "+973", name: "Bahrain"},
        {code: "+974", name: "Qatar"},
        {code: "+975", name: "Bhutan"},
        {code: "+976", name: "Mongolia"},
        {code: "+977", name: "Nepal"},
        {code: "+992", name: "Tajikistan"},
        {code: "+993", name: "Turkmenistan"},
        {code: "+994", name: "Azerbaijan"},
        {code: "+995", name: "Georgia"},
        {code: "+996", name: "Kyrgyzstan"},
        {code: "+998", name: "Uzbekistan"},
    ];
    const titleOptions = ["", "Dr.", "Mr.", "Mrs.", "Ms.", "Prof."];
    const sexOptions = ["", "Female", "Male"];

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setTempUser({...tempUser, [name]: value});
    };

    const formatDateOfBirth = (digits) => {
        if (!digits) return "";
        const day = digits.slice(0, 2);
        const month = digits.slice(2, 4);
        const year = digits.slice(4, 8);

        if (digits.length <= 2) {
            return digits.length === 2 ? `${day}-` : day;
        }
        if (digits.length <= 4) {
            return digits.length === 4 ? `${day}-${month}-` : `${day}-${month}`;
        }
        return `${day}-${month}-${year}`;
    };

    const handleDateOfBirthChange = (e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        const prevValue = previousDobRef.current || "";
        const prevDigits = prevValue.replace(/\D/g, "");
        const isDeleting = e.target.value.length < prevValue.length;
        let nextDigits = digits;

        if (isDeleting && prevDigits.length === digits.length) {
            const cursor = e.target.selectionStart ?? e.target.value.length;
            if (prevValue[cursor] === "-") {
                const digitsBefore = prevValue.slice(0, cursor).replace(/\D/g, "").length;
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

    const handleTitleChange = (e) => {
        const value = e.target.value;
        setTempUser((prevState) => ({...prevState, title: value}));
        setUser((prevState) => ({...prevState, title: value}));
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
    }

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
        setIsVerifyingUsername(false);
        if (!editState[field]) {
            setTempUser({...tempUser, [field]: user[field]});
        }
        if (field === "dateOfBirth") {
            setDateOfBirthError("");
        }
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

            // Validate email before sending request
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

    const validateDateOfBirth = (value) => {
        if (!value) {
            return "Please enter a date of birth.";
        }
        const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!match) {
            return "Use format DD-MM-YYYY.";
        }
        const day = Number(match[1]);
        const month = Number(match[2]);
        if (day < 1 || day > 31) {
            return "Day must be between 01 and 31.";
        }
        if (month < 1 || month > 12) {
            return "Month must be between 01 and 12.";
        }
        return "";
    };

    const formatBirthdateForStorage = (value) => {
        const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!match) return value;
        return `${match[3]}-${match[2]}-${match[1]}`;
    };

    const formatBirthdateForDisplay = (value) => {
        if (!value) return value;
        if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
        const parts = value.split("-");
        if (parts.length !== 3 || parts[0].length !== 4) return value;
        const [year, month, day] = parts;
        const paddedMonth = month.padStart(2, "0");
        const paddedDay = day.padStart(2, "0");
        return `${paddedDay}-${paddedMonth}-${year}`;
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

    const saveUserPlaceOfBirth = () => {
        setUser({...user, placeOfBirth: tempUser.placeOfBirth});
        toggleEditState('placeOfBirth');
    };

    const handleKeyPressDateOfBirth = (e) => {
        if (e.key === 'Enter') {
            saveUserDateOfBirth();
        }
    };

    const handleKeyPressPlaceOfBirth = (e) => {
        if (e.key === 'Enter') {
            saveUserPlaceOfBirth();
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
        setStripPhone(user.phone)
    }, [user]);

    const fetchUserData = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            setUser({
                email: userInfo.attributes.email,
                name: userInfo.attributes['given_name'],
                address: userInfo.attributes.address,
                phone: userInfo.attributes.phone_number,
                family: "2 adults - 2 kids",
                title: '',
                dateOfBirth: formatBirthdateForDisplay(userInfo.attributes.birthdate || ''),
                placeOfBirth: '',
                sex: userInfo.attributes.gender || '',
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

    return (
        <div className="page-body host-settings-page">
            <h2>Settings</h2>
            <div className="dashboards">
                <div className="content">
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="InfoBox">
                            <div className="infoBoxText">
                                <span>Title:</span>
                                <div className="infoBoxEditRow">
                                    <select
                                        name="title"
                                        value={user.title}
                                        onChange={handleTitleChange}
                                        className="guest-edit-input"
                                    >
                                        {titleOptions.map((option) => (
                                            <option key={option || "empty"} value={option}>
                                                {option || "Select title"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <div className="infoBoxText">
                                <span>Full name:</span>
                                {editState.name ? (
                                    <div className="infoBoxEditRow">
                                        <input
                                            type="text"
                                            name="name"
                                            value={tempUser.name}
                                            onChange={handleInputChange}
                                            className="guest-edit-input"
                                            onKeyPress={handleKeyPressName}
                                        />
                                    </div>
                                ) : (
                                    <p>{user.name || "-"}</p>
                                )}
                            </div>
                            <div className="infoBoxActions">
                                <div
                                    onClick={editState.name ? saveUserName : undefined}
                                    className={`host-icon-background save-button${editState.name ? "" : " is-hidden"}`}
                                    role="button">
                                    <img src={checkIcon} alt="Save Name" className="save-check-icon" />
                                </div>
                                <div
                                    onClick={() => toggleEditState('name')}
                                    className={`host-icon-background edit-button${editState.name ? " is-active" : ""}`}>
                                    {editState.name ? (
                                        <span className="edit-x" aria-hidden="true">X</span>
                                    ) : (
                                        <img src={editIcon} alt="Edit Name" className="guest-edit-icon"/>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <div className="infoBoxText">
                                <span>Email:</span>
                                {editState.email ? (
                                    <div className="infoBoxEditRow">
                                        {!isVerifying ? (
                                            <>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={tempUser.email}
                                                    onChange={handleInputChange}
                                                    className="guest-edit-input"
                                                    onKeyPress={handleKeyPressEmail}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    name="verificationCode"
                                                    value={verificationCode}
                                                    onChange={handleVerificationInputChange}
                                                    placeholder="Code sent to your email!"
                                                    className="guest-edit-input"
                                                    onKeyPress={handleKeyPressEmail}
                                                />
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <p>{user.email || "-"}</p>
                                )}
                            </div>
                            <div className="infoBoxActions">
                                <div
                                    onClick={editState.email ? saveUserEmail : undefined}
                                    className={`host-icon-background save-button${editState.email ? "" : " is-hidden"}`}
                                    role="button">
                                    <img src={checkIcon} alt="Save Email" className="save-check-icon" />
                                </div>
                                <div
                                    onClick={() => toggleEditState('email')}
                                    className={`host-icon-background edit-button${editState.email ? " is-active" : ""}`}>
                                    {editState.email ? (
                                        <span className="edit-x" aria-hidden="true">X</span>
                                    ) : (
                                        <img src={editIcon} alt="Edit Email" className="guest-edit-icon"/>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <div className="infoBoxText">
                                <span>Phone:</span>
                                {editState.phone ? (
                                    <div className="infoBoxEditRow">
                                        <select
                                            value={selectedCountryCode}
                                            onChange={handleCountryCodeChange}
                                            className="countryCodeDropdown"
                                        >
                                            {countryCodes.map((country, index) => (
                                                <option key={index} value={country.code}>
                                                    {country.name} ({country.code})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            name="phone"
                                            placeholder="Phone Number"
                                            value={stripPhone}
                                            onChange={handlePhoneChange}
                                            className="guest-edit-input"
                                            onKeyPress={handleKeyPressPhone}
                                        />
                                    </div>
                                ) : (
                                    <p>{user.phone || "-"}</p>
                                )}
                            </div>
                            <div className="infoBoxActions">
                                <div
                                    onClick={editState.phone ? saveUserPhone : undefined}
                                    className={`host-icon-background save-button${editState.phone ? "" : " is-hidden"}`}
                                    role="button">
                                    <img src={checkIcon} alt="Save Phone number" className="save-check-icon" />
                                </div>
                                <div
                                    onClick={() => toggleEditState('phone')}
                                    className={`host-icon-background edit-button${editState.phone ? " is-active" : ""}`}>
                                    {editState.phone ? (
                                        <span className="edit-x" aria-hidden="true">X</span>
                                    ) : (
                                        <img src={editIcon} alt="Edit Phone number" className="guest-edit-icon"/>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <div className="infoBoxText">
                                <span>Sex:</span>
                                <div className="infoBoxEditRow">
                                    <select
                                        name="sex"
                                        value={user.sex}
                                        onChange={handleSexChange}
                                        className="guest-edit-input"
                                    >
                                        {sexOptions.map((option) => (
                                            <option key={option || "empty"} value={option}>
                                                {option || "Select sex"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <div className="infoBoxText">
                                <span>Date of birth:</span>
                                {editState.dateOfBirth ? (
                                    <div className="infoBoxEditRow">
                                        <input
                                            type="text"
                                            name="dateOfBirth"
                                            placeholder="DD-MM-YYYY"
                                            value={tempUser.dateOfBirth}
                                            onChange={handleDateOfBirthChange}
                                            className="guest-edit-input"
                                            onKeyPress={handleKeyPressDateOfBirth}
                                            inputMode="numeric"
                                        />
                                        {dateOfBirthError && (
                                            <p className="field-error">{dateOfBirthError}</p>
                                        )}
                                    </div>
                                ) : user.dateOfBirth ? (
                                    <p>{user.dateOfBirth}</p>
                                ) : (
                                    <p className="placeholder-text">DD-MM-YYYY</p>
                                )}
                            </div>
                            <div className="infoBoxActions">
                                <div
                                    onClick={editState.dateOfBirth ? saveUserDateOfBirth : undefined}
                                    className={`host-icon-background save-button${editState.dateOfBirth ? "" : " is-hidden"}`}
                                    role="button">
                                    <img src={checkIcon} alt="Save Date of Birth" className="save-check-icon" />
                                </div>
                                <div
                                    onClick={() => toggleEditState('dateOfBirth')}
                                    className={`host-icon-background edit-button${editState.dateOfBirth ? " is-active" : ""}`}>
                                    {editState.dateOfBirth ? (
                                        <span className="edit-x" aria-hidden="true">X</span>
                                    ) : (
                                        <img src={editIcon} alt="Edit Date of Birth" className="guest-edit-icon"/>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <div className="infoBoxText">
                                <span>Place of birth:</span>
                                {editState.placeOfBirth ? (
                                    <div className="infoBoxEditRow">
                                        <input
                                            type="text"
                                            name="placeOfBirth"
                                            placeholder="Country"
                                            value={tempUser.placeOfBirth}
                                            onChange={handleInputChange}
                                            className="guest-edit-input"
                                            onKeyPress={handleKeyPressPlaceOfBirth}
                                        />
                                    </div>
                                ) : user.placeOfBirth ? (
                                    <p>{user.placeOfBirth}</p>
                                ) : (
                                    <p className="placeholder-text">Country</p>
                                )}
                            </div>
                            <div className="infoBoxActions">
                                <div
                                    onClick={editState.placeOfBirth ? saveUserPlaceOfBirth : undefined}
                                    className={`host-icon-background save-button${editState.placeOfBirth ? "" : " is-hidden"}`}
                                    role="button">
                                    <img src={checkIcon} alt="Save Place of Birth" className="save-check-icon" />
                                </div>
                                <div
                                    onClick={() => toggleEditState('placeOfBirth')}
                                    className={`host-icon-background edit-button${editState.placeOfBirth ? " is-active" : ""}`}>
                                    {editState.placeOfBirth ? (
                                        <span className="edit-x" aria-hidden="true">X</span>
                                    ) : (
                                        <img src={editIcon} alt="Edit Place of Birth" className="guest-edit-icon"/>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Voorlopig gecommend samen met Stefan aangezien we nu nog geen need hebben (misschien later) */}
                        {/*<div className="InfoBox">*/}
                        {/*    <span>Address:</span>*/}
                        {/*    <p>{user.address}</p>*/}
                        {/*    <div className="edit-icon-background">*/}
                        {/*        <img src={editIcon} alt="Edit Address" className="guest-edit-icon" />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                        {/*<div className="InfoBox">*/}
                        {/*    <span>Phone:</span>*/}
                        {/*    <p>{user.phone}</p>*/}
                        {/*    <div className="edit-icon-background">*/}
                        {/*        <img src={editIcon} alt="Edit Phone" className="guest-edit-icon" />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                        {/*<div className="InfoBox">*/}
                        {/*    <span>Family:</span>*/}
                        {/*    <p>{user.family}</p>*/}
                        {/*    <div className="edit-icon-background">*/}
                        {/*        <img src={editIcon} alt="Edit Family" className="guest-edit-icon" />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default HostSettings;
