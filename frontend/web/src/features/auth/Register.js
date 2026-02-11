import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth } from "aws-amplify";
import FlowContext from "../../services/FlowContext";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { flowState, setFlowState } = useContext(FlowContext);

  const generateRandomUsername = () => {
    const chars = String.fromCharCode(...Array(127).keys()).slice(33);
    return Array.from({ length: 15 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
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
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    repeatPassword: "",
  });

  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const [isPasswordStrong, setIsPasswordStrong] = useState(false);
  const [passwordShake, setPasswordShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const passwordRef = useRef(null);
  const strengthBarRef = useRef(null);
  const strengthTextRef = useRef(null);
  const strengthContainerRef = useRef(null);

  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  const redirectToUse = queryRedirect || encodeURIComponent(location.pathname + location.search);

  const handleLoginClick = (e) => {
    e.preventDefault();
    navigate(`/login?redirect=${redirectToUse}`);
  };

  const handleHostChange = (e) => {
    setFlowState((prev) => ({ ...prev, isHost: e.target.checked }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }

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

    if (strengthBarRef.current) {
      strengthBarRef.current.style.width = `${(strength / 4) * 100}%`;

      if (strength < 2) {
        setStrengthUI("red", "Bad");
        setIsPasswordStrong(false);
      } else if (strength === 2) {
        setStrengthUI("orange", "Weak");
        setIsPasswordStrong(false);
      } else if (strength === 3) {
        setStrengthUI("#088f08", "Strong");
        setIsPasswordStrong(true);
      } else {
        setStrengthUI("green", "Very Strong");
        setIsPasswordStrong(true);
      }
    }

    if (strengthContainerRef.current) {
      strengthContainerRef.current.style.display = "block";
    }
  };

  const setStrengthUI = (color, text) => {
    if (strengthBarRef.current) strengthBarRef.current.style.backgroundColor = color;
    if (strengthTextRef.current) {
      strengthTextRef.current.textContent = text;
      strengthTextRef.current.style.color = color;
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const { email, password, repeatPassword, firstName, lastName, phone, username } = formData;

    const nextErrors = {
      firstName: !firstName ? "First name is required." : "",
      lastName: !lastName ? "Last name is required." : "",
      email: !email ? "Email is required." : "",
      phone: !phone ? "Phone number is required." : "",
      password: !password
        ? "Password is required."
        : !isPasswordStrong
          ? "Password does not meet the requirements."
          : "",
      repeatPassword: !repeatPassword
        ? "Please confirm your password."
        : password !== repeatPassword
          ? "Passwords do not match."
          : "",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
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
      if (error.code === "UsernameExistsException") {
        setFieldErrors((prev) => ({
          ...prev,
          email: "An account with this email already exists.",
        }));
      } else {
        setErrorMessage(error.message || "An unexpected error occurred");
      }
    }
  };

  return (
    <div className="registerContainer">
      <div className="registerTitle">Create an account on Domits</div>

      <form onSubmit={onSubmit} className="registerForm">
        <label>First Name*</label>
        <input
          className="registerInput"
          name="firstName"
          onChange={handleChange}
          style={{ borderColor: fieldErrors.firstName ? "red" : "var(--secondary-color)" }}
        />
        {fieldErrors.firstName && <div className="fieldError">{fieldErrors.firstName}</div>}

        <label>Last Name*</label>
        <input
          className="registerInput"
          name="lastName"
          onChange={handleChange}
          style={{ borderColor: fieldErrors.lastName ? "red" : "var(--secondary-color)" }}
        />
        {fieldErrors.lastName && <div className="fieldError">{fieldErrors.lastName}</div>}

        <label>Email*</label>
        <input
          className="registerInput"
          name="email"
          type="email"
          onChange={handleChange}
          style={{ borderColor: fieldErrors.email ? "red" : "var(--secondary-color)" }}
        />
        {fieldErrors.email && <div className="fieldError">{fieldErrors.email}</div>}

        <label>Phone Number*</label>
        <PhoneInput
          country={"nl"}
          value={formData.phone}
          onChange={(phone) => setFormData((p) => ({ ...p, phone }))}
          inputStyle={{
            borderColor: fieldErrors.phone ? "red" : "var(--secondary-color)",
          }}
        />
        {fieldErrors.phone && <div className="fieldError">{fieldErrors.phone}</div>}

        <label>Password*</label>
        <input
          ref={passwordRef}
          className={`registerInput ${passwordShake ? "inputShake" : ""}`}
          name="password"
          type="password"
          onChange={handleChange}
          onFocus={() => (strengthContainerRef.current.style.display = "block")}
          style={{ borderColor: fieldErrors.password ? "red" : "var(--secondary-color)" }}
        />
        {fieldErrors.password && <div className="fieldError">{fieldErrors.password}</div>}

        <label>Confirm Password*</label>
        <input
          className={`registerInput ${passwordShake ? "inputShake" : ""}`}
          name="repeatPassword"
          type="password"
          onChange={handleChange}
          style={{ borderColor: fieldErrors.repeatPassword ? "red" : "var(--secondary-color)" }}
        />
        {fieldErrors.repeatPassword && <div className="fieldError">{fieldErrors.repeatPassword}</div>}

        <div ref={strengthContainerRef} className="strength-container" style={{ display: "none" }}>
          <div id="strength-bar" ref={strengthBarRef}></div>
          <div className="strength-text" ref={strengthTextRef}></div>

          <div className="requirements">
            <label className={!requirements.length ? "requirement-error" : ""}>
              <input type="checkbox" checked={requirements.length} readOnly />
              At least 8 characters
            </label>

            <label className={!requirements.uppercase ? "requirement-error" : ""}>
              <input type="checkbox" checked={requirements.uppercase} readOnly />
              At least 1 uppercase letter
            </label>

            <label className={!requirements.number ? "requirement-error" : ""}>
              <input type="checkbox" checked={requirements.number} readOnly />
              At least 1 number
            </label>

            <label className={!requirements.specialChar ? "requirement-error" : ""}>
              <input type="checkbox" checked={requirements.specialChar} readOnly />
              At least 1 special character
            </label>
          </div>
        </div>

        <label className="hostCheckbox">
          <input type="checkbox" checked={flowState.isHost} onChange={handleHostChange} /> Become a Host
        </label>

        {errorMessage && <div className="errorText">{errorMessage}</div>}

        <button type="submit" className="registerButton">
          Sign Up
        </button>

        <div className="alreadyAccountText">
          Already have an account?{" "}
          <a href={`/login?redirect=${redirectToUse}`} onClick={handleLoginClick}>
            Log in here
          </a>
        </div>
      </form>
    </div>
  );
};

export default Register;
