import styles from "./hostverification.module.css";
import Option from "./components/Option";
import Listing from "./components/Listing";
import { useNavigate, useLocation } from 'react-router-dom';
import useOptionVisibility from "./hooks/useOptionVisibility";
import Loading from "./components/Loading";

const HostVerificationView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const id = "e0707e21-a0e4-4a4f-a2b8-0b67135dd17f";
  const { registrationNumber } = location.state || {};

  const { isRegistrationNumberRequired, loading, error } =
    useOptionVisibility(id);

  const handleClick = () => {
    navigate(`/verify/registrationnumber/${id}`);
  };

  if (loading) {
    return <Loading/>;
  }

  return (
    <main className={styles["main-container"]}>
      <div className={styles["left-container"]}>
        <h1>What is the next step?</h1>
        {isRegistrationNumberRequired && (
          <>
            <Option
              option="Meet local requirements"
              subtext="Your municipality wants hosts to first arrange certain things before they are allowed to rent out."
              onClick={handleClick}
            />
            <hr />
          </>
        )}
        <Option
          option="Verify your identity"
          subtext="Tell us how you host and share a few required details."
        />
        <hr></hr>
        <Option option="Connect with stripe to receive payments" />
        <hr></hr>
        <Option
          option="Confirm your phone number"
          subtext="We will text to confirm your number."
        />
      </div>
      <div className={styles["right-container"]}>
        <Listing />
      </div>
      <div className={styles["bottom-container"]}>
        <hr></hr>
        <button className={styles["publish-btn"]}>Publish Listing</button>
      </div>
    </main>
  );
};

export default HostVerificationView;
