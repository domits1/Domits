import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import FlowContext from "../../services/FlowContext";
import PhoneInput from "react-phone-input-2";
import '@fortawesome/fontawesome-free/css/all.min.css';

// import 'react-phone-input-2/lib/style.css';

const Register = () => {
  const navigate = useNavigate();
  const { flowState, setFlowState } = useContext(FlowContext);

  const generateRandomUsername = () => {
    const chars = String.fromCharCode(...Array(127).keys()).slice(33);
    let result = "";
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    repeatPassword: "",
    username: generateRandomUsername(),
    firstName: "",
    lastName: "",
    phone: "",
  });

  // error states
  const [errorMessage, setErrorMessage] = useState("");
  const [errorMessageFirstName, setErrorMessageFirstName] = useState("");
  const [errorMessageLastName, setErrorMessageLastName] = useState("");
  const [errorMessageEmail, setErrorMessageEmail] = useState("");
  const [errorMessagePhone, setErrorMessagePhone] = useState("");
  const [errorMessagePassword, setErrorMessagePassword] = useState("");
  const [errorMessageRepeatPassword, setErrorMessageRepeatPassword] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [passwordShake, setPasswordShake] = useState(false);

  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });
  const [isPasswordStrong, setIsPasswordStrong] = useState(false);

  // show / hide password states
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef(null);
  const strengthBarRef = useRef(null);
  const strengthTextRef = useRef(null);
  const strengthContainerRef = useRef(null);

  const handleLoginClick = (e) => {
    e.preventDefault();
    navigate("/login");
  };

  const handleHostChange = (e) => {
    setFlowState((prevState) => ({
      ...prevState,
      isHost: e.target.checked,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    const newRequirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
    };

    setRequirements(newRequirements);

    const strength = Object.values(newRequirements).filter(Boolean).length;

    const strengthBar = strengthBarRef.current;

    if (strengthBar) {
      const strengthPercentage = (strength / 4) * 100;
      strengthBar.style.width = strengthPercentage + "%";

      if (strength < 2) {
        setColorAndText("red", "Bad");
        setIsPasswordStrong(false);
      } else if (strength === 2) {
        setColorAndText("orange", "Weak");
        setIsPasswordStrong(false);
      } else if (strength === 3) {
        setColorAndText("#088f08", "Strong");
        setIsPasswordStrong(true);
      } else if (strength === 4) {
        setColorAndText("green", "Very Strong");
        setIsPasswordStrong(true);
      }
    }

    if (strengthContainerRef.current) {
      strengthContainerRef.current.style.display = "block";
    }
  };

  const setColorAndText = (color, text) => {
    if (strengthBarRef.current) {
      strengthBarRef.current.style.backgroundColor = color;
    }
    if (strengthTextRef.current) {
      strengthTextRef.current.textContent = text;
      strengthTextRef.current.style.color = color;
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const { username, email, password, repeatPassword, firstName, lastName, phone } = formData;

    let isValid = true;

   // Error messages updated for professional, clear tone
if (firstName.trim().length < 1) {
  setErrorMessageFirstName("First name is required.");
  isValid = false;
} else {
  setErrorMessageFirstName("");
}

if (lastName.trim().length < 1) {
  setErrorMessageLastName("Last name is required.");
  isValid = false;
} else {
  setErrorMessageLastName("");
}

if (email.trim().length < 1) {
  setErrorMessageEmail("Please enter a valid email address.");
  isValid = false;
} else {
  setErrorMessageEmail("");
}

if (phone.trim().length < 8) {
  setErrorMessagePhone("Please enter a valid phone number including area code.");
  isValid = false;
} else {
  setErrorMessagePhone("");
}

if (password.length === 0) {
  setErrorMessagePassword("Please enter a valid password");
} else if (password.length < 8) {
  setErrorMessagePassword("Password must contain at least 8 characters.");
  setPasswordShake(true);
  isValid = false;
}

if (repeatPassword.length === 0) {
  setErrorMessageRepeatPassword("Please confirm your password.");
  isValid = false;
} else if (repeatPassword !== password) {
  setErrorMessageRepeatPassword("Passwords do not match. Please check again.");
  isValid = false;
} else {
  setErrorMessageRepeatPassword("");
}

if (!isPasswordStrong) {
  setErrorMessage(
    "Your password is too weak. Please include uppercase letters, numbers, and special characters for a stronger password."
  );
  setPasswordShake(true);
  isValid = false;
}

if (!isValid) return;

try {
  const groupName = flowState.isHost ? "Host" : "Traveler";
  await Auth.signUp({
    username: email,
    password,
    attributes: {
      "custom:group": groupName,
      "custom:username": username,
      given_name: firstName,
      family_name: lastName,
      phone_number: `+${phone}`,
    },
  });
  navigate("/confirm-email", { state: { email, password } });
} catch (error) {
  console.log("Sign-up failed:", error);
  if (error.code === "UsernameExistsException") {
    setErrorMessage("An account with this email already exists. Please log in.");
  } else {
    setErrorMessage(error.message || "An unexpected error occurred. Please try again later.");
  }
}
  };

  const handleSignOut = async () => {
    try {
      await Auth.signOut();
      setIsAuthenticated(false);
      window.location.reload();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await Auth.currentAuthenticatedUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShouldShake(false);
      setPasswordShake(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [errorMessage]);

  return (
    <>
      {isAuthenticated ? (
        <div className="signOutDiv">
          <button className="signOutButton" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="registerContainer">
          <div className="registerTitle">Create an account on Domits</div>
          <form onSubmit={onSubmit} className="registerForm">
            <label>First Name*</label>
            <input
              className="registerInput"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              style={{ borderColor: errorMessageFirstName ? "red" : "var(--secondary-color)" }}
            />
            {errorMessageFirstName && <p className="errorMessage">{errorMessageFirstName}</p>} 

            <label>Last Name*</label>
            <input
              className="registerInput"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              style={{ borderColor: errorMessageLastName ? "red" : "var(--secondary-color)" }}
            />
            {errorMessageLastName && <p className="errorMessage">{errorMessageLastName}</p>}

            <label>Email*</label>
            <input
              className="registerInput"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{ borderColor: errorMessageEmail ? "red" : "var(--secondary-color)" }}
            />
            {errorMessageEmail && <p className="errorMessage">{errorMessageEmail}</p>}

            <label>Phone Number*</label>
            <PhoneInput
              country={"nl"}
              value={formData.phone}
              onChange={(phone) => setFormData((prev) => ({ ...prev, phone }))}
              inputClass="registerInput"
              containerClass={`phoneInputContainer ${errorMessagePhone ? "inputError" : ""}`}
            />
            {errorMessagePhone && <p className="errorMessage">{errorMessagePhone}</p>}
            
          
<label>Password*</label>
<div className="passwordContainer">
  <input
    id="password"
    ref={passwordRef}
    className={`registerInput ${errorMessagePassword ? "inputError" : ""} ${
      passwordShake ? "inputShake" : ""
    }`}
    type={showPassword ? "text" : "password"}
    name="password"
    value={formData.password}
    onChange={handleChange}
    onFocus={() => {
      if (strengthContainerRef.current) {
        strengthContainerRef.current.style.display = "block";
      }
    }}
    style={{ borderColor: errorMessagePassword ? "red" : "var(--secondary-color)" }}
  />
  <i
    className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} togglePasswordContainer`}
    onClick={() => setShowPassword((prev) => !prev)}
  ></i>
</div>
{errorMessagePassword && <p className="errorMessage">{errorMessagePassword}</p>}



            <label>Confirm Password*</label>
            <div className="passwordContainer">
              <input
                id="repeatPassword"
                className={`registerInput ${errorMessageRepeatPassword ? "inputError" : ""}`}

                name="repeatPassword"
                value={formData.repeatPassword}
                onChange={handleChange}
                style={{ borderColor: errorMessageRepeatPassword ? "red" : "var(--secondary-color)" }}
              />
                </div>
               {errorMessageRepeatPassword && <p className="errorMessage">{errorMessageRepeatPassword}</p>}
          
            

            {/* Strength meter */}
            <div ref={strengthContainerRef} className="strength-container" style={{ display: "none" }}>
              <div id="strength-bar" ref={strengthBarRef}></div>
              <div className="strength-text" ref={strengthTextRef}></div>
              <div className="requirements">
                <label>
                  <input type="checkbox" checked={requirements.length} readOnly />
                  At least 8 characters
                </label>
                <label>
                  <input type="checkbox" checked={requirements.uppercase} readOnly />
                  At least 1 uppercase letter
                </label>
                <label>
                  <input type="checkbox" checked={requirements.number} readOnly />
                  At least 1 number
                </label>
                <label>
                  <input type="checkbox" checked={requirements.specialChar} readOnly />
                  At least 1 special character
                </label>
              </div>
            </div>

            <label className="hostCheckbox">
              <input type="checkbox" checked={flowState.isHost} onChange={handleHostChange} /> Become a Host
            </label>

            <div className="alreadyAccountText">
              Already have an account?{" "}
              <a onClick={handleLoginClick} href="#login">
                Log in here
              </a>
            </div>

            {errorMessage && <div className="errorText">{errorMessage}</div>}

            <button type="submit" className="registerButton" onClick={() => setShouldShake(true)}>
              Sign Up
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Register;
 