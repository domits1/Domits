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

  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const queryRedirect = new URLSearchParams(location.search).get("redirect");
  const redirectToUse = queryRedirect || encodeURIComponent(location.pathname + location.search);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleHostChange = (e) => {
    setFlowState((prev) => ({ ...prev, isHost: e.target.checked }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const { email, password, repeatPassword, firstName, lastName, phone, username } = formData;

    const errors = {
      firstName: !firstName,
      lastName: !lastName,
      email: !email,
      phone: !phone,
      password: !password,
      repeatPassword: password !== repeatPassword,
    };

    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) return;

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
          phone_number: phone.startsWith("+") ? phone : `+${phone}`,
        },
      });

      navigate("/confirm-email", {
        state: { email, password, redirect: queryRedirect },
      });
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h2 className="title">Create account</h2>

        <form onSubmit={onSubmit}>
          <div className="inputGroup">
            <div className="iconBox"><FaUser /></div>
            <input name="firstName" placeholder="First name" onChange={handleChange} />
          </div>

          <div className="inputGroup">
            <div className="iconBox"><FaUser /></div>
            <input name="lastName" placeholder="Last name" onChange={handleChange} />
          </div>

          <div className="inputGroup">
            <div className="iconBox"><FaEnvelope /></div>
            <input name="email" placeholder="Email" onChange={handleChange} />
          </div>

          <div className="inputGroup phoneGroup">
            <div className="iconBox"><FaPhone /></div>
            <PhoneInput
              country={"nl"}
              countryCodeEditable={false}
              inputProps={{
                name: "phone",
                required: true,
                autoFocus: false,
              }}
              value={formData.phone}
              onChange={(value) => setFormData((p) => ({ ...p, phone: value }))}
            />
          </div>

          <div className="inputGroup">
            <div className="iconBox"><FaLock /></div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              onChange={handleChange}
            />

            <div className="eyeIcon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </div>
          </div>

          <div className="inputGroup">
            <div className="iconBox"><FaLock /></div>
            <input
              type={showPassword ? "text" : "password"}
              name="repeatPassword"
              placeholder="Repeat password"
              onChange={handleChange}
            />

            <div className="eyeIcon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </div>
          </div>

          <label className="hostCheckbox">
            <input type="checkbox" checked={flowState.isHost} onChange={handleHostChange} />
            Become a Host
          </label>

          {errorMessage && <div className="error">{errorMessage}</div>}

          <button className="primaryBtn">Sign Up</button>

          <div className="divider"></div>

          <div className="bottomText">
            Already have an account?
          </div>

          <button
            type="button"
            className="registerBtn"
            onClick={() => navigate(`/login?redirect=${redirectToUse}`)}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;