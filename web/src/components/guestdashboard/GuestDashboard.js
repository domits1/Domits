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
        setTempUser({ ...tempUser, [name]: value }); // Update the temporary state
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
            // Verify the confirmation code
            try {
                const result = await confirmEmailChange(verificationCode);
                if (result.success) {
                    console.log("Email verification successful");
                    setUser({ ...user, email: tempUser.email }); // Save the email after verification
                    toggleEditState('email'); // Close the input field after saving
                } else {
                    console.error("Verification failed:", result.error);
                }
            } catch (error) {
                console.error("Error confirming email verification:", error);
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
            console.log("Update result:", result);

            // Check the status code to determine if the email already exists
            if (response.status === 200) {
                setIsVerifying(true); // Set to verifying mode after successful update
            } else if (response.status === 400 && result.message === "This email address is already in use.") {
                // This is where you show the alert if the email is already in use
                alert(result.message); // Popup alert for user feedback
            } else {
                console.error("Unexpected error:", result.message);
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
            console.log("Update result:", result);

            if (result.statusCode === 200) {
                setUser({ ...user, name: tempUser.name }); // Save the name after successful update
                toggleEditState('name'); // Close the input field immediately after saving
            }
        } catch (error) {
            console.error("Error updating username:", error);
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

                        {/* Email section */}
                        <div className="infoBox">
                            <span>Email:</span>
                            {editState.email ? (
                                <div style={{ display: 'flex' }}>
                                    {!isVerifying ? (
                                        <>
                                            <input
                                                type="email"
                                                name="email"
                                                value={tempUser.email} // Bind the temporary state to input
                                                onChange={handleInputChange}
                                                className="guest-edit-input"
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

                        {/* Username section */}
                        <div className="infoBox">
                            <span>Name:</span>
                            {editState.name ? (
                                <div style={{ display: 'flex' }}>
                                    <input
                                        type="text"
                                        name="name"
                                        value={tempUser.name} // Bind the temporary state to input
                                        onChange={handleInputChange}
                                        className="guest-edit-input"
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
