import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";
import { API, graphqlOperation, Auth } from "aws-amplify";
import Pages from "./Pages.js";
import { confirmEmailChange } from "./emailSettings";


const GuestDashboard = () => {
    const [tempUser, setTempUser] = useState({ email: '', name: '' });
    const [user, setUser] = useState({ email: '', name: '', address: '', phone: '', family: '' });
    const [editState, setEditState] = useState({ email: false, name: false });
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerifyingUsername, setIsVerifyingUsername] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTempUser({ ...tempUser, [name]: value });
    };

    const handleVerificationInputChange = (e) => {
        setVerificationCode(e.target.value);
    };

    const toggleEditState = (field) => {
        setEditState((prevState) => ({ ...prevState, [field]: !prevState[field] }));
        setIsVerifying(false);
        setIsVerifyingUsername(false);
        if (!editState[field]) {
            setTempUser({ ...tempUser, [field]: user[field] });
        }
    };

    const saveUserEmail = async () => {
        if (isVerifying) {
            try {
                const result = await confirmEmailChange(verificationCode);
                if (result.success) {
                    setUser({ ...user, email: tempUser.email });
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

            const params = {
                userId,
                newEmail,
            };

            const response = await fetch('https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/UpdateUserEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();

            let parsedBody = result.body;
            if (typeof parsedBody === 'string') {
                parsedBody = JSON.parse(parsedBody);
            }

            if (parsedBody.message === "Email update successful, please verify your new email.") {
                setIsVerifying(true);
            } else if (parsedBody.message === "This email address is already in use.") {
                alert(parsedBody.message);
            } else {
                console.error("Unexpected error:", parsedBody.message || "No message provided");
            }
        } catch (error) {
            console.error("Error updating email:", error);
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

            const response = await fetch('https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/UpdateUserName', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                setUser({ ...user, name: tempUser.name });
                toggleEditState('name');
            }
        } catch (error) {
            console.error("Error updating username:", error);
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

    useEffect(() => {
        fetchAccommodations();
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            setUser({
                email: userInfo.attributes.email,
                name: userInfo.attributes['preferred_username'],
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
        <div className="container">
            <h2>Dashboard</h2>
            <div className="dashboards">
                <Pages />
                <div className="content">
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="infoBox">
                            <span>Email:</span>
                            {editState.email ? (
                                <div style={{ display: 'flex' }}>
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
                                            <div onClick={saveUserEmail} className="edit-icon-background">
                                                <img src={checkIcon} alt="Save Email" className="guest-check-icon" />
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
                                            <div onClick={saveUserEmail} className="edit-icon-background">
                                                <img src={checkIcon} alt="Confirm Verification Code" className="guest-check-icon" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <p>{user.email}</p>
                            )}
                            <div onClick={() => toggleEditState('email')} className="edit-icon-background">
                                <img src={editIcon} alt="Edit Email" className="guest-edit-icon" />
                            </div>
                        </div>

                        <div className="infoBox">
                            <span>Name:</span>
                            {editState.name ? (
                                <div style={{ display: 'flex' }}>
                                    <input
                                        type="text"
                                        name="name"
                                        value={tempUser.name}
                                        onChange={handleInputChange}
                                        className="guest-edit-input"
                                        onKeyPress={handleKeyPressName}
                                    />
                                    <div onClick={saveUserName} className="edit-icon-background">
                                        <img src={checkIcon} alt="Save Name" className="guest-check-icon" />
                                    </div>
                                </div>
                            ) : (
                                <p>{user.name}</p>
                            )}
                            <div onClick={() => toggleEditState('name')} className="edit-icon-background">
                                <img src={editIcon} alt="Edit Name" className="guest-edit-icon" />
                            </div>
                        </div>

                        <div className="infoBox">
                            <span>Address:</span>
                            <p>{user.address}</p>
                            <div className="edit-icon-background">
                                <img src={editIcon} alt="Edit Address" className="guest-edit-icon" />
                            </div>
                        </div>

                        <div className="infoBox">
                            <span>Phone:</span>
                            <p>{user.phone}</p>
                            <div className="edit-icon-background">
                                <img src={editIcon} alt="Edit Phone" className="guest-edit-icon" />
                            </div>
                        </div>

                        <div className="infoBox">
                            <span>Family:</span>
                            <p>{user.family}</p>
                            <div className="edit-icon-background">
                                <img src={editIcon} alt="Edit Family" className="guest-edit-icon" />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestDashboard;
