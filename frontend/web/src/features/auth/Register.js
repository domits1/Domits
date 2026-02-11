import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth } from "aws-amplify";
import FlowContext from "../../services/FlowContext";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

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

  const [fieldErrors, setFieldErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    password: false,
    repeatPassword: false,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [signUpClicked, setSignUpClicked] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [passwordShake, setPasswordShake] = useState(false);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });
  const [isPasswordStrong, setIsPasswordStrong] = useState(false);
  const passwordRef = useRef(null);
  const strengthBarRef = useRef(null);
  const strengthTextRef = useRef(null);
  const strengthContainerRef = useRef(null);

  const location = useLocation();
  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  const redirectToUse = queryRedirect || encodeURIComponent(location.pathname + location.search);

  const handleLoginClick = (e) => {
    e.preventDefault();
    navigate(`/login?redirect=${redirectToUse}`);
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

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: false }));
    }

    if (name === "password") {
      checkPasswordStrength(value);
    }

    if (name === "password" || name === "repeatPassword") {
      if (fieldErrors.repeatPassword) {
        setFieldErrors((prev) => ({ ...prev, repeatPassword: false }));
      }
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;

    const newRequirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[^A-Za-z0-9]/.test(password),
    };

    setRequirements(newRequirements);

    for (const key in newRequirements) {
      if (newRequirements[key]) strength++;
    }

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
    const strengthBar = strengthBarRef.current;
    const strengthText = strengthTextRef.current;

    if (strengthBar) strengthBar.style.backgroundColor = color;
    if (strengthText) {
      strengthText.textContent = text;
      strengthText.style.color = color;
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const { username, email, password, repeatPassword, firstName, lastName, phone } = formData;

    const nextErrors = {
      firstName: !firstName,
      lastName: !lastName,
      email: !email,
      phone: !phone,
      password: !password || !isPasswordStrong,
      repeatPassword: !repeatPassword || password !== repeatPassword,
    };

    setFieldErrors(nextErrors);

    if (!firstName) {
      setErrorMessage("First name cannot be empty.");
      return;
    }
    if (!lastName) {
      setErrorMessage("Last name cannot be empty.");
      return;
    }
    if (!email) {
      setErrorMessage("Email can't be empty!");
      return;
    }
    if (!phone) {
      setErrorMessage("Phone number cannot be empty.");
      return;
    }
    if (!password) {
      setErrorMessage("Password can't be empty!");
      setPasswordShake(true);
      return;
    }
    if (!isPasswordStrong) {
      setErrorMessage("Password must be strong to submit.");
      setPasswordShake(true);
      return;
    }
    if (!repeatPassword) {
      setErrorMessage("Confirm Password can't be empty!");
      setPasswordShake(true);
      return;
    }
    if (password !== repeatPassword) {
      setErrorMessage("Passwords do not match.");
      setPasswordShake(true);
      return;
    }

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

      navigate("/confirm-email", {
        state: { email, password, redirect: queryRedirect },
      });
    } catch (error) {
      console.log("Sign-up failed:", error);

      if (error.code === "UsernameExistsException") {
        setFieldErrors((prev) => ({ ...prev, email: true }));
        setErrorMessage("Email already exists!");
      } else {
        setErrorMessage(error.message || "An unexpected error occurred");
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
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!errorMessage.includes("Username")) {
        setShouldShake(false);
      }
      if (
        !errorMessage.includes("Password") &&
        !errorMessage.includes("Confirm Password") &&
        !errorMessage.includes("match")
      ) {
        setPasswordShake(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [errorMessage]);

  useEffect(() => {
    if (signUpClicked) {
      setSignUpClicked(false);
    }
  }, [signUpClicked]);

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
              style={{ borderColor: fieldErrors.firstName ? "red" : "var(--secondary-color)" }}
            />

            <label>Last Name*</label>
            <input
              className="registerInput"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              style={{ borderColor: fieldErrors.lastName ? "red" : "var(--secondary-color)" }}
            />

            <label>Email*</label>
            <input
              className="registerInput"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{ borderColor: fieldErrors.email ? "red" : "var(--secondary-color)" }}
            />

            <label>Phone Number*</label>
            <PhoneInput
              country={"nl"}
              value={formData.phone}
              onChange={(phone) => {
                setFormData((prevState) => ({ ...prevState, phone }));
                if (fieldErrors.phone) {
                  setFieldErrors((prev) => ({ ...prev, phone: false }));
                }
              }}
            />

            <label>Password*</label>
            <div className="passwordContainer">
              <input
                id="password"
                ref={passwordRef}
                className={`registerInput ${passwordShake ? "inputShake" : ""}`}
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => {
                  if (strengthContainerRef.current) {
                    strengthContainerRef.current.style.display = "block";
                  }
                }}
                style={{ borderColor: fieldErrors.password ? "red" : "var(--secondary-color)" }}
              />
            </div>

            <label>Confirm Password*</label>
            <input
              className={`registerInput ${passwordShake ? "inputShake" : ""}`}
              type="password"
              name="repeatPassword"
              value={formData.repeatPassword}
              onChange={handleChange}
              style={{ borderColor: fieldErrors.repeatPassword ? "red" : "var(--secondary-color)" }}
            />

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
              <a onClick={handleLoginClick} href={`/login?redirect=${redirectToUse}`}>
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
