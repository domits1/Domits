import React, {useEffect, useState} from "react";
import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";
import {API, graphqlOperation, Auth} from "aws-amplify";
import Pages from "./Pages.js";
import {confirmEmailChange} from "../guestdashboard/emailSettings";
import './styles/settingshostdashboard.css';


const HostSettings = () => {
    const [tempUser, setTempUser] = useState({email: '', name: '', phone: ''});
    const [user, setUser] = useState({email: '', name: '', address: '', phone: '', family: ''});
    const [editState, setEditState] = useState({email: false, name: false, phone: false});
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerifyingUsername, setIsVerifyingUsername] = useState(false);
    const [selectedCountryCode, setSelectedCountryCode] = useState("+1");
    const [stripPhone, setStripPhone] = useState("");

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

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setTempUser({...tempUser, [name]: value});
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

    useEffect(() => {
        fetchAccommodations();
        fetchUserData();
    }, []);

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
                family: "2 adults - 2 kids"
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
        <div className="page-body">
            <h2>Dashboard</h2>
            <div className="dashboards">
                <Pages/>
                <div className="content">
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="InfoBox">
                            <span>Email:</span>
                            {editState.email ? (
                                <div style={{display: 'flex'}}>
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
                                            <div onClick={saveUserEmail} className="host-icon-background">
                                                <img src={checkIcon} alt="Save Email" className="guest-check-icon"/>
                                            </div>
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
                                            <div onClick={saveUserEmail} className="host-icon-background">
                                                <img src={checkIcon} alt="Confirm Verification Code"
                                                     className="guest-check-icon"/>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <p>{user.email}</p>
                            )}
                            <div onClick={() => toggleEditState('email')} className="host-icon-background">
                                <img src={editIcon} alt="Edit Email" className="guest-edit-icon"/>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <span>Name:</span>
                            {editState.name ? (
                                <div style={{display: 'flex'}}>
                                    <input
                                        type="text"
                                        name="name"
                                        value={tempUser.name}
                                        onChange={handleInputChange}
                                        className="guest-edit-input"
                                        onKeyPress={handleKeyPressName}
                                    />
                                    <div onClick={saveUserName} className="host-icon-background">
                                        <img src={checkIcon} alt="Save Name" className="guest-check-icon"/>
                                    </div>
                                </div>
                            ) : (
                                <p>{user.name}</p>
                            )}
                            <div onClick={() => toggleEditState('name')} className="host-icon-background">
                                <img src={editIcon} alt="Edit Name" className="guest-edit-icon"/>
                            </div>
                        </div>

                        <div className="InfoBox">
                            <span>Phone:</span>
                            {editState.phone ? (
                                <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
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
                                    <div onClick={saveUserPhone} className="host-icon-background">
                                        <img src={checkIcon} alt="Save Number" className="guest-check-icon"/>
                                    </div>
                                </div>
                            ) : (
                                <p>{user.phone}</p>
                            )}
                            <div onClick={() => toggleEditState('phone')} className="host-icon-background">
                                <img src={editIcon} alt="Edit Phone number" className="guest-edit-icon"/>
                            </div>
                        </div>
                        {/* Voorlopig gecommend samen met Stefan aangezien we nu nog geen need hebben (misschien later) */}
                        {/*<div className="InfoBox">*/}
                        {/*    <span>Address:</span>*/}
                        {/*    <p>{user.address}</p>*/}
                        {/*    <div className="edit-icon-background">*/}
                        {/*        <img shared={editIcon} alt="Edit Address" className="guest-edit-icon" />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                        {/*<div className="InfoBox">*/}
                        {/*    <span>Phone:</span>*/}
                        {/*    <p>{user.phone}</p>*/}
                        {/*    <div className="edit-icon-background">*/}
                        {/*        <img shared={editIcon} alt="Edit Phone" className="guest-edit-icon" />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                        {/*<div className="InfoBox">*/}
                        {/*    <span>Family:</span>*/}
                        {/*    <p>{user.family}</p>*/}
                        {/*    <div className="edit-icon-background">*/}
                        {/*        <img shared={editIcon} alt="Edit Family" className="guest-edit-icon" />*/}
                        {/*    </div>*/}
                        {/*</div>*/}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default HostSettings;
