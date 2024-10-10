import React from "react";
import styles from "./hostverification.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import useAddRegistrationNumber from "./hooks/useAddRegistrationNumber";
import Loading from "./components/Loading";

function RegistrationNumberCheckView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { registrationNumber, accommodationData } = location.state || {};
  const { addRegistrationNumber, loading, error } = useAddRegistrationNumber();

  const handleClick = async () => {
    try {
      await addRegistrationNumber(accommodationData.ID, registrationNumber);
      navigate("/verify", { state: { registrationNumber: true } });
    } catch (err) {
      console.error("Error adding registration number:", err);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <main className={styles["verification-container"]}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="8 6 12 10"
        width="14"
        height="22"
      >
        <path
          d="M15 6l-6 6 6 6"
          stroke="#000"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className={styles["headertext-container"]}>
        <h1>Check your details</h1>
        <p>
          Before submitting your registration information, please check that all
          information is correct.
        </p>
      </div>
      <hr></hr>
      <div className={styles["registrationnumber-container"]}>
        <div className={styles["registrationnumber-inputfield"]}>
          <h1>Registration information</h1>
          <h2>Registration number</h2>
          <p>{registrationNumber}</p>
        </div>
        <div className={styles["registrationnumber-address"]}>
          <h2>Listing address</h2>
          <p>
            {accommodationData.Street}, {accommodationData.City},{" "}
            {accommodationData.PostalCode}, {accommodationData.Country}
          </p>
        </div>
      </div>
      <hr></hr>
      <div className={styles["bottom-container"]}>
        <button onClick={handleClick} className={styles["publish-btn"]}>
          Submit
        </button>
      </div>
    </main>
  );
}

export default RegistrationNumberCheckView;
