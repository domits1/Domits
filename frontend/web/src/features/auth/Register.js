import React, { useState, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth } from "aws-amplify";
import FlowContext from "../../services/FlowContext";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaPhone,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import "../../styles/sass/features/auth/auth.scss";
import "../../styles/sass/features/auth/register.scss";

const generateRandomUsername = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  return Array.from(
    { length: 15 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const getPasswordError = (
  password,
  isPasswordStrong
) => {
  if (!password) {
    return "Password is required.";
  }

  if (!isPasswordStrong) {
    return "Password does not meet the requirements.";
  }

  return "";
};

const getRepeatPasswordError = (
  password,
  repeatPassword
) => {
  if (!repeatPassword) {
    return "Please confirm your password.";
  }

  if (password !== repeatPassword) {
    return "Passwords do not match.";
  }

  return "";
};

const validateForm = (
  formData,
  isPasswordStrong
) => ({
  firstName: formData.firstName
    ? ""
    : "First name is required.",

  lastName: formData.lastName
    ? ""
    : "Last name is required.",

  email: formData.email
    ? ""
    : "Email is required.",

  phone: formData.phone
    ? ""
    : "Phone number is required.",

  password: getPasswordError(
    formData.password,
    isPasswordStrong
  ),

  repeatPassword: getRepeatPasswordError(
    formData.password,
    formData.repeatPassword
  ),
});

const getStrengthConfig = (strength) => {
  const configs = {
    0: {
      color: "red",
      text: "Bad",
      isStrong: false,
    },
    1: {
      color: "red",
      text: "Bad",
      isStrong: false,
    },
    2: {
      color: "orange",
      text: "Weak",
      isStrong: false,
    },
    3: {
      color: "#088f08",
      text: "Strong",
      isStrong: true,
    },
    4: {
      color: "green",
      text: "Very Strong",
      isStrong: true,
    },
  };

  return configs[strength];
};

const setStrengthUI = (
  strengthBarRef,
  strengthTextRef,
  color,
  text
) => {
  if (strengthBarRef.current) {
    strengthBarRef.current.style.backgroundColor =
      color;
  }

  if (strengthTextRef.current) {
    strengthTextRef.current.textContent = text;
    strengthTextRef.current.style.color = color;
  }
};

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { flowState, setFlowState } = useContext(FlowContext);

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
  const [showPassword, setShowPassword] = useState(false);

  const strengthBarRef = useRef(null);
  const strengthTextRef = useRef(null);
  const strengthContainerRef = useRef(null);

  const queryRedirect = new URLSearchParams(location.search).get("redirect");

  const redirectToUse =
    queryRedirect ||
    encodeURIComponent(location.pathname + location.search);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    if (name === "password") {
      checkPasswordStrength(value);
    }
  };

  const handleHostChange = (e) => {
    setFlowState((prev) => ({
      ...prev,
      isHost: e.target.checked,
    }));
  };

const checkPasswordStrength = (password) => {
  const newRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    specialChar: /[^A-Za-z0-9]/.test(password),
  };

  setRequirements(newRequirements);

  const strength =
    Object.values(newRequirements).filter(Boolean)
      .length;

  const config = getStrengthConfig(strength);

  setStrengthUI(
    strengthBarRef,
    strengthTextRef,
    config.color,
    config.text
  );

  setIsPasswordStrong(config.isStrong);

  if (strengthBarRef.current) {
    strengthBarRef.current.style.width = `${(strength / 4) * 100}%`;
  }

  if (strengthContainerRef.current) {
    strengthContainerRef.current.style.display =
      "block";
  }
};

  const handleRegisterError = (error) => {
    if (error.code === "UsernameExistsException") {
      setFieldErrors((prev) => ({
        ...prev,
        email:
          "An account with this email already exists.",
      }));

      return;
    }

    setErrorMessage(
      error.message || "An unexpected error occurred"
    );
  };

  const registerUser = async () => {
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      username,
    } = formData;

    try {
      const groupName = flowState.isHost
        ? "Host"
        : "Traveler";

      await Auth.signUp({
        username: email,
        password,
        attributes: {
          "custom:group": groupName,
          "custom:username": username,
          given_name: firstName,
          family_name: lastName,
          phone_number: phone.startsWith("+")
            ? phone
            : `+${phone}`,
        },
      });

      navigate("/confirm-email", {
        state: {
          email,
          password,
          redirect: queryRedirect,
        },
      });
    } catch (error) {
      handleRegisterError(error);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = validateForm(
      formData,
      isPasswordStrong
    );

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setPasswordShake(true);
      return;
    }

    await registerUser();
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h2 className="title">Create account</h2>

        <form onSubmit={onSubmit}>
          <div className="inputGroup">
            <div className="iconBox">
              <FaUser />
            </div>

            <input
              name="firstName"
              placeholder="First name"
              onChange={handleChange}
              style={{
                borderColor: fieldErrors.firstName
                  ? "red"
                  : "",
              }}
            />
          </div>

          {fieldErrors.firstName && (
            <div className="fieldError">
              {fieldErrors.firstName}
            </div>
          )}

          <div className="inputGroup">
            <div className="iconBox">
              <FaUser />
            </div>

            <input
              name="lastName"
              placeholder="Last name"
              onChange={handleChange}
              style={{
                borderColor: fieldErrors.lastName
                  ? "red"
                  : "",
              }}
            />
          </div>

          {fieldErrors.lastName && (
            <div className="fieldError">
              {fieldErrors.lastName}
            </div>
          )}

          <div className="inputGroup">
            <div className="iconBox">
              <FaEnvelope />
            </div>

            <input
              name="email"
              type="email"
              placeholder="Email"
              onChange={handleChange}
              style={{
                borderColor: fieldErrors.email
                  ? "red"
                  : "",
              }}
            />
          </div>

          {fieldErrors.email && (
            <div className="fieldError">
              {fieldErrors.email}
            </div>
          )}

          <div className="inputGroup phoneGroup">
            <div className="iconBox">
              <FaPhone />
            </div>

            <PhoneInput
              country={"nl"}
              countryCodeEditable={false}
              value={formData.phone}
              inputProps={{
                name: "phone",
                required: true,
              }}
              inputStyle={{
                borderColor: fieldErrors.phone
                  ? "red"
                  : "",
              }}
              onChange={(phone) =>
                setFormData((prev) => ({
                  ...prev,
                  phone,
                }))
              }
            />
          </div>

          {fieldErrors.phone && (
            <div className="fieldError">
              {fieldErrors.phone}
            </div>
          )}

          <div className="inputGroup">
            <div className="iconBox">
              <FaLock />
            </div>

            <input
              className={`${
                passwordShake ? "inputShake" : ""
              }`}
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              onChange={handleChange}
              onFocus={() =>
                (strengthContainerRef.current.style.display =
                  "block")
              }
              style={{
                borderColor: fieldErrors.password
                  ? "red"
                  : "",
              }}
            />

            <button
              type="button"
              className="eyeIcon"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <FaEye />
              ) : (
                <FaEyeSlash />
              )}
            </button>
          </div>

          {fieldErrors.password && (
            <div className="fieldError">
              {fieldErrors.password}
            </div>
          )}

          <div className="inputGroup">
            <div className="iconBox">
              <FaLock />
            </div>

            <input
              className={`${
                passwordShake ? "inputShake" : ""
              }`}
              type={showPassword ? "text" : "password"}
              name="repeatPassword"
              placeholder="Repeat password"
              onChange={handleChange}
              style={{
                borderColor: fieldErrors.repeatPassword
                  ? "red"
                  : "",
              }}
            />

            <button
              type="button"
              className="eyeIcon"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <FaEye />
              ) : (
                <FaEyeSlash />
              )}
            </button>
          </div>

          {fieldErrors.repeatPassword && (
            <div className="fieldError">
              {fieldErrors.repeatPassword}
            </div>
          )}

          <div
            ref={strengthContainerRef}
            className="strength-container"
            style={{ display: "none" }}
          >
            <div
              id="strength-bar"
              ref={strengthBarRef}
            ></div>

            <div
              className="strength-text"
              ref={strengthTextRef}
            ></div>

            <div className="requirements">
              <label
                className={
                  requirements.length
                    ? ""
                    : "requirement-error"
                }
              >
                <input
                  type="checkbox"
                  checked={requirements.length}
                  readOnly
                />
                <span>At least 8 characters</span>
              </label>

              <label
                className={
                  requirements.uppercase
                    ? ""
                    : "requirement-error"
                }
              >
                <input
                  type="checkbox"
                  checked={requirements.uppercase}
                  readOnly
                />
                <span>At least 1 uppercase letter</span>
              </label>

              <label
                className={
                  requirements.number
                    ? ""
                    : "requirement-error"
                }
              >
                <input
                  type="checkbox"
                  checked={requirements.number}
                  readOnly
                />
                <span>At least 1 number</span>
              </label>

              <label
                className={
                  requirements.specialChar
                    ? ""
                    : "requirement-error"
                }
              >
                <input
                  type="checkbox"
                  checked={requirements.specialChar}
                  readOnly
                />
                <span>At least 1 special character</span>
              </label>
            </div>
          </div>

          <label className="hostCheckbox">
            <input
              type="checkbox"
              checked={flowState.isHost}
              onChange={handleHostChange}
            />
            <span>Become a Host</span>
          </label>

          {errorMessage && (
            <div className="error">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="primaryBtn"
          >
            Sign Up
          </button>

          <div className="divider"></div>

          <div className="bottomText">
            Already have an account?
          </div>

          <button
            type="button"
            className="registerBtn"
            onClick={() =>
              navigate(
                `/login?redirect=${redirectToUse}`
              )
            }
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;