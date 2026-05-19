import React, { useContext, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import FlowContext from "../../services/FlowContext";

import {
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPhone,
  FaUser,
} from "react-icons/fa";

import "../../styles/sass/features/auth/auth.scss";
import "../../styles/sass/features/auth/register.scss";

const PASSWORD_REQUIREMENT_ITEMS = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "At least 1 uppercase letter" },
  { key: "number", label: "At least 1 number" },
  { key: "specialChar", label: "At least 1 special character" },
];

const FIELD_ERRORS_PROP_TYPE = PropTypes.shape({
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  email: PropTypes.string,
  phone: PropTypes.string,
  password: PropTypes.string,
  repeatPassword: PropTypes.string,
});

const FORM_DATA_PROP_TYPE = PropTypes.shape({
  email: PropTypes.string,
  password: PropTypes.string,
  repeatPassword: PropTypes.string,
  username: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  phone: PropTypes.string,
});

const REQUIREMENTS_PROP_TYPE = PropTypes.shape({
  length: PropTypes.bool,
  uppercase: PropTypes.bool,
  number: PropTypes.bool,
  specialChar: PropTypes.bool,
});

const REF_OBJECT_PROP_TYPE = PropTypes.shape({
  current: PropTypes.any,
});

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

const getPasswordRequirements = (password) => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
  specialChar: /[^A-Za-z0-9]/.test(password),
});

const calculateStrength = (requirements) =>
  Object.values(requirements).filter(Boolean)
    .length;

const getInputBorderStyle = (errorMessage) => ({
  borderColor: errorMessage ? "red" : "",
});

const getPasswordInputType = (showPassword) =>
  showPassword ? "text" : "password";

const getPasswordToggleLabel = (showPassword) =>
  showPassword ? "Hide password" : "Show password";

const getShakeClassName = (isShaking) =>
  isShaking ? "inputShake" : "";

const getRequirementClassName = (isMet) =>
  isMet ? "" : "requirement-error";

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

const updateStrengthBar = (
  strength,
  color,
  strengthBarRef
) => {
  if (!strengthBarRef.current) {
    return;
  }

  strengthBarRef.current.style.width = `${
    (strength / 4) * 100
  }%`;

  strengthBarRef.current.style.backgroundColor =
    color;
};

const showStrengthContainer = (
  strengthContainerRef
) => {
  if (strengthContainerRef.current) {
    strengthContainerRef.current.style.display =
      "block";
  }
};

const applyPasswordStrength = ({
  password,
  setRequirements,
  setIsPasswordStrong,
  strengthBarRef,
  strengthTextRef,
  strengthContainerRef,
}) => {
  const nextRequirements =
    getPasswordRequirements(password);

  setRequirements(nextRequirements);

  const strength =
    calculateStrength(nextRequirements);

  const config = getStrengthConfig(strength);

  setStrengthUI(
    strengthBarRef,
    strengthTextRef,
    config.color,
    config.text
  );

  setIsPasswordStrong(config.isStrong);

  updateStrengthBar(
    strength,
    config.color,
    strengthBarRef
  );

  showStrengthContainer(strengthContainerRef);
};

const handleRegisterError = (
  error,
  setFieldErrors,
  setErrorMessage
) => {
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

const registerUser = async ({
  formData,
  isHost,
  navigate,
  redirect,
  setFieldErrors,
  setErrorMessage,
}) => {
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    username,
  } = formData;

  const groupName = isHost
    ? "Host"
    : "Traveler";

  try {
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
        redirect,
      },
    });
  } catch (error) {
    handleRegisterError(
      error,
      setFieldErrors,
      setErrorMessage
    );
  }
};

const getLoginPath = (redirect) =>
  redirect
    ? `/login?redirect=${redirect}`
    : "/login";

const FieldErrorMessage = ({ message }) =>
  message ? (
    <div className="fieldError">{message}</div>
  ) : null;

FieldErrorMessage.propTypes = {
  message: PropTypes.string,
};

const PasswordVisibilityButton = ({
  showPassword,
  onToggle,
}) => (
  <button
    type="button"
    className="eyeIcon"
    onClick={onToggle}
    aria-label={getPasswordToggleLabel(showPassword)}
  >
    {showPassword ? <FaEye /> : <FaEyeSlash />}
  </button>
);

PasswordVisibilityButton.propTypes = {
  showPassword: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const PasswordRequirements = ({
  requirements,
}) => (
  <div className="requirements">
    {PASSWORD_REQUIREMENT_ITEMS.map((item) => (
      <label
        key={item.key}
        className={getRequirementClassName(
          requirements[item.key]
        )}
      >
        <input
          type="checkbox"
          checked={requirements[item.key]}
          readOnly
        />
        <span>{item.label}</span>
      </label>
    ))}
  </div>
);

PasswordRequirements.propTypes = {
  requirements: REQUIREMENTS_PROP_TYPE.isRequired,
};

const FormInputField = ({
  className = "inputGroup",
  icon,
  errorMessage,
  children,
}) => (
  <>
    <div className={className}>
      <div className="iconBox">{icon}</div>
      {children}
    </div>
    <FieldErrorMessage message={errorMessage} />
  </>
);

FormInputField.propTypes = {
  className: PropTypes.string,
  icon: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const PasswordInputField = ({
  name,
  placeholder,
  errorMessage,
  passwordShake,
  showPassword,
  onChange,
  onFocus,
  onTogglePassword,
}) => (
  <FormInputField
    icon={<FaLock />}
    errorMessage={errorMessage}
  >
    <input
      className={getShakeClassName(passwordShake)}
      type={getPasswordInputType(showPassword)}
      name={name}
      placeholder={placeholder}
      onChange={onChange}
      onFocus={onFocus}
      style={getInputBorderStyle(errorMessage)}
    />
    <PasswordVisibilityButton
      showPassword={showPassword}
      onToggle={onTogglePassword}
    />
  </FormInputField>
);

PasswordInputField.propTypes = {
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  errorMessage: PropTypes.string,
  passwordShake: PropTypes.bool.isRequired,
  showPassword: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onTogglePassword: PropTypes.func.isRequired,
};

const RegisterForm = ({
  formData,
  fieldErrors,
  requirements,
  passwordShake,
  showPassword,
  isHost,
  errorMessage,
  strengthContainerRef,
  strengthBarRef,
  strengthTextRef,
  onSubmit,
  onFieldChange,
  onPhoneChange,
  onHostChange,
  onPasswordFocus,
  onTogglePassword,
  onLoginClick,
}) => (
  <form onSubmit={onSubmit}>
    <FormInputField
      icon={<FaUser />}
      errorMessage={fieldErrors.firstName}
    >
      <input
        name="firstName"
        placeholder="First name"
        onChange={onFieldChange}
        style={getInputBorderStyle(
          fieldErrors.firstName
        )}
      />
    </FormInputField>

    <FormInputField
      icon={<FaUser />}
      errorMessage={fieldErrors.lastName}
    >
      <input
        name="lastName"
        placeholder="Last name"
        onChange={onFieldChange}
        style={getInputBorderStyle(
          fieldErrors.lastName
        )}
      />
    </FormInputField>

    <FormInputField
      icon={<FaEnvelope />}
      errorMessage={fieldErrors.email}
    >
      <input
        name="email"
        type="email"
        placeholder="Email"
        onChange={onFieldChange}
        style={getInputBorderStyle(fieldErrors.email)}
      />
    </FormInputField>

    <FormInputField
      className="inputGroup phoneGroup"
      icon={<FaPhone />}
      errorMessage={fieldErrors.phone}
    >
      <PhoneInput
        country={"nl"}
        countryCodeEditable={false}
        value={formData.phone}
        inputProps={{
          name: "phone",
          required: true,
        }}
        inputStyle={getInputBorderStyle(
          fieldErrors.phone
        )}
        onChange={onPhoneChange}
      />
    </FormInputField>

    <PasswordInputField
      name="password"
      placeholder="Password"
      errorMessage={fieldErrors.password}
      passwordShake={passwordShake}
      showPassword={showPassword}
      onChange={onFieldChange}
      onFocus={onPasswordFocus}
      onTogglePassword={onTogglePassword}
    />

    <PasswordInputField
      name="repeatPassword"
      placeholder="Repeat password"
      errorMessage={fieldErrors.repeatPassword}
      passwordShake={passwordShake}
      showPassword={showPassword}
      onChange={onFieldChange}
      onTogglePassword={onTogglePassword}
    />

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

      <PasswordRequirements
        requirements={requirements}
      />
    </div>

    <label className="hostCheckbox">
      <input
        type="checkbox"
        checked={isHost}
        onChange={onHostChange}
      />
      <span>Become a Host</span>
    </label>

    {errorMessage && (
      <div className="error">{errorMessage}</div>
    )}

    <button
      type="submit"
      className="primaryBtn"
    >
      Sign Up
    </button>

    <div className="bottomText">
      Already have an account?
    </div>

    <button
      type="button"
      className="registerBtn"
      onClick={onLoginClick}
    >
      Login
    </button>
  </form>
);

RegisterForm.propTypes = {
  formData: FORM_DATA_PROP_TYPE.isRequired,
  fieldErrors: FIELD_ERRORS_PROP_TYPE.isRequired,
  requirements: REQUIREMENTS_PROP_TYPE.isRequired,
  passwordShake: PropTypes.bool.isRequired,
  showPassword: PropTypes.bool.isRequired,
  isHost: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  strengthContainerRef:
    REF_OBJECT_PROP_TYPE.isRequired,
  strengthBarRef: REF_OBJECT_PROP_TYPE.isRequired,
  strengthTextRef: REF_OBJECT_PROP_TYPE.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onPhoneChange: PropTypes.func.isRequired,
  onHostChange: PropTypes.func.isRequired,
  onPasswordFocus: PropTypes.func.isRequired,
  onTogglePassword: PropTypes.func.isRequired,
  onLoginClick: PropTypes.func.isRequired,
};

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { flowState, setFlowState } =
    useContext(FlowContext);

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

  const [isPasswordStrong, setIsPasswordStrong] =
    useState(false);
  const [passwordShake, setPasswordShake] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);

  const strengthBarRef = useRef(null);
  const strengthTextRef = useRef(null);
  const strengthContainerRef = useRef(null);

  const queryRedirect = new URLSearchParams(
    location.search
  ).get("redirect");

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
      applyPasswordStrength({
        password: value,
        setRequirements,
        setIsPasswordStrong,
        strengthBarRef,
        strengthTextRef,
        strengthContainerRef,
      });
    }
  };

  const handlePhoneChange = (phone) => {
    setFormData((prev) => ({
      ...prev,
      phone,
    }));

    if (fieldErrors.phone) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: "",
      }));
    }
  };

  const handleHostChange = (e) => {
    setFlowState((prev) => ({
      ...prev,
      isHost: e.target.checked,
    }));
  };

  const handlePasswordFocus = () =>
    showStrengthContainer(strengthContainerRef);

  const handleTogglePassword = () =>
    setShowPassword((prev) => !prev);

  const handleLoginClick = () =>
    navigate(getLoginPath(queryRedirect));

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

    await registerUser({
      formData,
      isHost: flowState.isHost,
      navigate,
      redirect: queryRedirect,
      setFieldErrors,
      setErrorMessage,
    });
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h2 className="title">Create account</h2>

        <RegisterForm
          formData={formData}
          fieldErrors={fieldErrors}
          requirements={requirements}
          passwordShake={passwordShake}
          showPassword={showPassword}
          isHost={flowState.isHost}
          errorMessage={errorMessage}
          strengthContainerRef={strengthContainerRef}
          strengthBarRef={strengthBarRef}
          strengthTextRef={strengthTextRef}
          onSubmit={onSubmit}
          onFieldChange={handleChange}
          onPhoneChange={handlePhoneChange}
          onHostChange={handleHostChange}
          onPasswordFocus={handlePasswordFocus}
          onTogglePassword={handleTogglePassword}
          onLoginClick={handleLoginClick}
        />
      </div>
    </div>
  );
};

export default Register;
