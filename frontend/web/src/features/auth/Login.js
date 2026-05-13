import React, { useState, useEffect, useRef } from "react";
import { Auth } from "aws-amplify";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from "react-icons/fa";
import DigitInputs from "../../components/ui/DigitsInputs/DigitsInputs";

import "../../styles/sass/features/auth/auth.scss";
import "../../styles/sass/features/auth/register.scss";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const _rawRedirect = new URLSearchParams(location.search).get("redirect");
  const redirect = _rawRedirect ? decodeURIComponent(_rawRedirect) : null;

  const [forgotPassword, setForgotPassword] = useState(false);
  const [confirmCode, setConfirmCode] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const inputRef = useRef([]);

  useEffect(() => {
  const checkAuth = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();

      if (redirect) return;

      const group = user.attributes["custom:group"];

      if (group === "Host") navigate("/hostdashboard");
      else navigate("/guestdashboard");
    } catch {}
  };

  checkAuth();
}, [navigate, redirect]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignIn = async () => {
    setErrorMessage("");
    try {
      await Auth.signIn(formData.email, formData.password);
      globalThis.dispatchEvent(new Event("authChanged"));

      redirect
        ? navigate(redirect)
        : globalThis.location.reload();
    } catch {
      setErrorMessage("Invalid email or password");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSignIn();
  };

  const handleRegisterClick = () => {
    const redirectForRegister =
      _rawRedirect || encodeURIComponent(location.pathname + location.search);
    navigate(`/register?redirect=${redirectForRegister}`);
  };

  const handlePasswordRecovery = async () => {
    try {
      const response = await fetch(
        "https://mncmdr9bol.execute-api.eu-north-1.amazonaws.com/default/GetUserIDUsingEmail",
        {
          method: "POST",
          body: JSON.stringify({ email: formData.email }),
          headers: { "Content-type": "application/json" },
        }
      );

      const data = await response.json();
      setUsername(data.body);

      await Auth.forgotPassword(data.body);

      setForgotPassword(false);
      setConfirmCode(true);
    } catch {
      setErrorMsg("User not found");
    }
  };

  const submitCodeAndPassword = async () => {
    let code = "";
    inputRef.current.forEach((input) => {
      code += input.value;
    });

    try {
      await Auth.forgotPasswordSubmit(username, code, formData.password);
      alert("Password updated successfully");
      setConfirmCode(false);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        {forgotPassword ? (
          <>
            <h2 className="title">Recover Password</h2>

            <div className="inputGroup">
              <div className="iconBox">
                <FaEnvelope />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {errorMsg && <div className="error">{errorMsg}</div>}

            <button className="primaryBtn" onClick={handlePasswordRecovery}>
              Send Code
            </button>

            <button className="secondaryBtn" onClick={() => setForgotPassword(false)}>
              Back
            </button>
          </>
        ) : confirmCode ? (
          <>
            <h2 className="title">Reset Password</h2>

            <DigitInputs amount={6} inputRef={inputRef} />

            <div className="inputGroup">
              <div className="iconBox">
                <FaLock />
              </div>
              <button
                type="button"
                className="eyeIcon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>

            {errorMessage && <div className="error">{errorMessage}</div>}

            <button className="primaryBtn" onClick={submitCodeAndPassword}>
              Confirm
            </button>
          </>
        ) : (
          <>
            <h2 className="title">Welcome back</h2>

            <form onSubmit={handleSubmit}>
              <div className="inputGroup">
                <div className="iconBox">
                  <FaEnvelope />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="inputGroup">
                <div className="iconBox">
                  <FaLock />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="eyeIcon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>

              <button
                type="button"
                className="forgotText"
                onClick={() => setForgotPassword(true)}
              >
                Forgot password?
              </button>

              {errorMessage && <div className="error">{errorMessage}</div>}

              <button type="submit" className="primaryBtn">
                Login
              </button>
            </form>

            <div className="divider"></div>

            <div className="bottomText">Don’t have an account?</div>

            <button className="registerBtn" onClick={handleRegisterClick}>
              Register
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;