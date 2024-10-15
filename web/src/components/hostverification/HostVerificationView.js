import styles from "./hostverification.module.css";
import Option from "./components/Option";
import Listing from "./components/Listing";
import { useNavigate, useLocation } from 'react-router-dom';
import useOptionVisibility from "./hooks/useIsRegistrationNumberRequired";
import Loading from "./components/Loading";
import { useEffect } from "react";

const HostVerificationView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // const { isRegistrationNumberRequired, loading, error } =
  //   useOptionVisibility(id);

  const handleClick = () => {
    
  };

  // if(error) {
  //   return <p>Something went wrong {error.message}</p>;
  // }

  // if (loading) {
  //   return <Loading/>;
  // }

  return (
    <main className={styles["main-container"]}>
      <div className={styles["left-container"]}>
        <h1>What is the next step?</h1>
        <Option
          option="Verify your identity"
          subtext="Tell us how you host and share a few required details."
          onClick={handleClick}
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
        {/* <Listing data={data}/> */}
      </div>
      <hr></hr>
      <div className={styles["bottom-container"]}>
        <button className={styles["publish-btn"]}>Publish Listing</button>
      </div>
    </main>
  );
};

export default HostVerificationView;
