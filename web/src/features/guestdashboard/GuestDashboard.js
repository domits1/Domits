import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";
import messageIcon from "../../images/icons/message-chat-circle.png";
import { API, graphqlOperation, Auth } from "aws-amplify";
import Pages from "./Pages.js";
import { confirmEmailChange } from "./emailSettings";
import MyPlace from "../../images/icons/placeholder.png";

const GuestDashboard = () => {
  const [tempUser, setTempUser] = useState({ email: "", name: "" });
  const [user, setUser] = useState({
    email: "",
    name: "",
    address: "",
    phone: "",
    family: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTempUser({ ...tempUser, [name]: value });
  };

  const handleVerificationInputChange = (e) => {
    setVerificationCode(e.target.value);
  };

  const toggleEditState = () => {
    setIsEditing((prev) => !prev);
    setIsVerifying(false);
    if (!isEditing) {
      setTempUser({ email: user.email, name: user.name });
    }
  };

  const saveUserEmail = async () => {
    if (isVerifying) {
      try {
        const result = await confirmEmailChange(verificationCode);
        if (result.success) {
          setUser({ ...user, email: tempUser.email });
          toggleEditState("email");
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
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-CustomerIAM-Production-Update-UserEmail",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (response.ok) {
        if (
          result.message ===
          "Email update successful, please verify your new email."
        ) {
          setIsVerifying(true);
        } else if (result.message === "This email address is already in use.") {
          alert(result.message);
        } else {
          console.error(
            "Unexpected error:",
            result.message || "No message provided"
          );
        }
      } else {
        console.error("Request failed with status:", response.status);
        alert("Failed to update email. Please try again later.");
      }
    } catch (error) {
      console.error("Error updating email:", error);
      alert(
        "An error occurred while updating the email. Please try again later."
      );
    }
  };

  const saveUserName = async () => {
    try {
      const userInfo = await Auth.currentAuthenticatedUser();
      const userId = userInfo.username;
      const newName = tempUser.name;

      const params = {
        userId,
        newName,
      };

      const response = await fetch(
        "https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-UserName",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (result.statusCode === 200) {
        setUser({ ...user, name: tempUser.name });
        toggleEditState("name");
      }
    } catch (error) {
      console.error("Error updating username:", error);
    }
  };

  const saveChanges = () => {
    saveUserEmail();
    saveUserName();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") saveChanges();
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
        name: userInfo.attributes["given_name"],
        address: userInfo.attributes.address,
        phone: userInfo.attributes.phone_number,
        family: "2 adults - 2 kids",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const fetchAccommodations = async () => {
    try {
      const response = await API.graphql(
        graphqlOperation(listAccommodationsQuery)
      );
      console.log("Accommodations:", response.data.listAccommodations.items);
    } catch (error) {
      console.error("Error listing accommodations:", error);
    }
  };

  return (
    <div className="page-body">
      <h2 className="Dashboard_h2">Dashboard</h2>
      <div className="dashboards">
        <Pages />
        <div className="content">
          <div className="accomodation-side">
            <label>
              <a className="viewAllBooking" href="#">
                View all bookings
              </a>
            </label>
            <p className="Booking_place">"Place of staying"</p>

            <img className="Booking_photo" src={MyPlace} alt="Description" />
            <p className="Booking_host">"host name"</p>

            <div className="messages-container">
              <span className="Booking_messages">Messages</span>
              <div className="badge">9+</div>
            </div>
            <p className="Booking_messages_centre">Go to messaging centre</p>
          </div>
          <div className="personalInfoContent">
            <div className="personal-info-header">
              <h3>Personal Information</h3>
              <div onClick={toggleEditState} className="edit-icon-background">
                <img
                  src={isEditing ? checkIcon : editIcon}
                  alt="Edit"
                  className="guest-edit-icon"
                />
              </div>
            </div>

            <div className="infoBox">
              <span>Email:</span>
              {isEditing ? (
                <>
                  <input
                    type="email"
                    name="email"
                    value={tempUser.email}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="guest-edit-input"
                  />
                </>
              ) : (
                <p>{user.email}</p>
              )}
            </div>

            <div className="infoBox">
              <span>Name:</span>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    name="name"
                    value={tempUser.name}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="guest-edit-input"
                    minLength={1}
                    maxLength={35}
                    pattern="[A-Za-z\s]+"
                  />
                </>
              ) : (
                <p>{user.name}</p>
              )}
            </div>

            <div className="infoBox">
              <span>Address:</span>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    name="address"
                    value={tempUser.address}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="guest-edit-input"
                    maxLength={100}
                  />
                </>
              ) : (
                <p>{user.address}</p>
              )}
            </div>

            <div className="infoBox">
              <span>Phone:</span>
              {isEditing ? (
                <>
                  <input
                    type="tel"
                    name="phone"
                    value={tempUser.phone}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="guest-edit-input"
                    pattern="[0-9\-\+\s]+"
                  />
                </>
              ) : (
                <p>{user.phone}</p>
              )}
            </div>

            <div className="infoBox">
              <span>Family:</span>
              {isEditing ? (
                <>
                  <textarea
                    name="family"
                    value={tempUser.family}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="guest-edit-input"
                    maxLength={200}
                  ></textarea>
                </>
              ) : (
                <p>{user.family}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestDashboard;
