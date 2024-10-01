import styles from "./hostverification.module.css";
import Option from "./components/Option";
import Listing from "./components/Listing";
import useOptionVisibility from "./hooks/useOptionVisibility";

const HostVerificationView = () => {
  const { isRegistrationNumberRequired, city, loading, error } = useOptionVisibility("e0707e21-a0e4-4a4f-a2b8-0b67135dd17f");

  return (
    <main className={styles["main-container"]}>
      <div className={styles["left-container"]}>
        <h1>What is the next step?</h1>
        {isRegistrationNumberRequired && (
          <>
            <Option option="Meet local requirements" />
            <hr />
          </>
        )}
        <Option option="Verify your identity" />
        <hr></hr>
        <Option option="Connect with stripe to receive payments" />
        <hr></hr>
        <Option option="Confirm your phone number" />
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
