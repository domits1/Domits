import { useRef, useState, useContext } from "react";
import { Auth } from "aws-amplify";
import { useLocation, useNavigate } from "react-router-dom";
import FlowContext from "../../../FlowContext";


export function useConfirmEmailLogic() {
  const inputRef = useRef([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { flowState } = useContext(FlowContext);
  const { isHost } = flowState;
  const [toastConfig, setToastConfig] = useState({
    message: "",
    status: "",
    duration: 3000,
  });

  const location = useLocation();
  const navigate = useNavigate();

  const userEmail = location.state?.email || "";
  const userPassword = location.state?.password || "";

  const handleComplete = (inputValue) => {
    if (!inputValue) {
      setIsComplete(false);
      return;
    }
    setIsComplete(true);
    setHasError(false);
  };

  const onSubmit = () => {
    if (!isComplete) return;
    if (toastConfig.message) return;
    if (loading) return;

    setLoading(true);
    let code = "";
    inputRef.current.forEach((input) => {
      code += input.value;
    });

    Auth.confirmSignUp(userEmail, code)
      .then(() => {
        return Auth.signIn(userEmail, userPassword);
      })
      .then(() => {
        if (isHost) {
          navigate("/hostdashboard");
          window.location.reload();
        } else {
          navigate("/");
          window.location.reload();
        }
      })
      .catch((error) => {
        setToastConfig({
          message: error.message,
          status: "error",
          duration: 3000,
        });
        setLoading(false);
        setHasError(true);
      });
  };

  const resendCode = () => {
    console.log("resendCode");
    if (userEmail === "") {
      navigate("/register");
    } else {
      Auth.resendSignUp(userEmail)
        .then(() => {
          setToastConfig({
            message: "We've sent a new code to your email.",
            status: "info",
            duration: 3000,
          });
        })
        .catch((error) => {
          setToastConfig({
            message: error.message,
            status: "error",
            duration: 3000,
          });
          setHasError(true);
        });
    }
  };
  return {
    inputRef,
    isComplete,
    loading,
    hasError,
    toastConfig,
    handleComplete,
    onSubmit,
    resendCode,
    setToastConfig,
    userEmail,
  };
}
