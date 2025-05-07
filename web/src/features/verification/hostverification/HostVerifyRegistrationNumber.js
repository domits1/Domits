import React, { useState, useEffect, useCallback } from "react";
import styles from "./hostverification.module.css";
import Loading from "./components/Loading";
import useIsRegistrationNumberRequired from "./hooks/useIsRegistrationNumberRequired";
import useFormStoreHostOnboarding from "../../hostonboarding/stores/formStoreHostOnboarding";
import OnboardingButton from "../../hostonboarding/components/OnboardingButton";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const RegistrationNumber = () => {
  const navigate = useNavigate();

  // --- Zustand Store Access ---
  const updateAccommodationDetail = useFormStoreHostOnboarding(
    (state) => state.updateAccommodationDetail
  );
  const accommodationType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  );
  const address = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.address,
  );
  const storeRegistrationNumber = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.registrationNumber
  );
  // ---------------------------

  // --- Local State ---
  const [registrationNumberInput, setRegistrationNumberInput] = useState(storeRegistrationNumber || "");
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [isProceedDisabled, setIsProceedDisabled] = useState(true); // Start as true, useEffect will update
  // -------------------

  const { isRegistrationNumberRequired, loading, error } =
    useIsRegistrationNumberRequired(address);

  // --- Effects ---
  // This effect determines if the "Proceed" button should be disabled.
  useEffect(() => {
    if (loading) { // If still loading isRegistrationNumberRequired, keep button disabled
      setIsProceedDisabled(true);
      return;
    }

    if (isRegistrationNumberRequired) {
      const hasValidRegNumber = registrationNumberInput && registrationNumberInput.trim() !== '';
      // If required, button is enabled only if reg number is entered AND checkbox is checked.
      if (hasValidRegNumber && isCheckboxChecked) {
        setIsProceedDisabled(false);
      } else {
        setIsProceedDisabled(true);
      }
    } else {
      // If registration number is not required, the button is always enabled.
      setIsProceedDisabled(false);
    }
  }, [registrationNumberInput, isCheckboxChecked, isRegistrationNumberRequired, loading]);
  // ---------------

  // --- Handlers ---
  const handleRegistrationNumberChange = (e) => {
    const value = e.target.value;
    setRegistrationNumberInput(value);
    updateAccommodationDetail('registrationNumber', value); // Update Zustand store
  };

  const handleCheckboxChange = (e) => {
    setIsCheckboxChecked(e.target.checked);
  };

  const handleProceed = useCallback(() => {
    // This check is a safeguard, primary control is the button's disabled state.
    if (isProceedDisabled) {
      if (isRegistrationNumberRequired) {
        if (!registrationNumberInput.trim()) {
          toast.error("Registration number is required. Please enter it.");
          return;
        }
        if (!isCheckboxChecked) {
          toast.error("Please agree to the terms by checking the box.");
          return;
        }
      } else {
        // Should not happen if logic is correct, but as a fallback:
        toast.error("Cannot proceed. Please check the form.");
        return;
      }
    }

    // Data is already in Zustand store via handleRegistrationNumberChange
    console.log("Proceeding from RegistrationNumber. Registration number in store:", useFormStoreHostOnboarding.getState().accommodationDetails.registrationNumber);
    navigate("/hostonboarding/summary");
  }, [
    navigate,
    isRegistrationNumberRequired,
    registrationNumberInput,
    isCheckboxChecked,
    isProceedDisabled, // Added isProceedDisabled to dependencies of useCallback
  ]);
  // ----------------

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <p>Something went wrong {error.message}</p>;
  }

  // Determine error messages for guidance
  let errorMessages = [];
  if (isProceedDisabled && isRegistrationNumberRequired) {
    if (!registrationNumberInput || !registrationNumberInput.trim()) {
      errorMessages.push("Please enter the registration number.");
    }
    if (!isCheckboxChecked) {
      errorMessages.push("Please agree to the terms by checking the box.");
    }
  }

  return (
    <main className={styles["verification-container"]}>
      <div className={styles["headertext-container"]}>
        <h1>Add your registration number</h1>
        <p>
          Your registration number will appear on your listing page, so that
          guests know that your accommodation is registered in {address.city || 'your city'}.
        </p>
      </div>
      <hr></hr>
      <div className={styles["registrationnumber-container"]}>
        <div className={styles["registrationnumber-inputfield"]}>
          {isRegistrationNumberRequired ? (
            <h2>Registration number *</h2>
          ) : (
            <h2>Registration number (optional)</h2>
          )}
          <input
            type="text"
            placeholder="For example: 'Abcd 1234 AB12 89EF A0F9'"
            value={registrationNumberInput}
            onChange={handleRegistrationNumberChange}
          />
        </div>
        <div className={styles["registrationnumber-address"]}>
          <h2>Listing address</h2>
          <p>
            {address.street || 'N/A'}, {address.city || 'N/A'}, {address.zipCode || 'N/A'},{" "}
            {address.country || 'N/A'}
          </p>
        </div>
        {isRegistrationNumberRequired && (
          <div className={styles["registrationnumber-legal"]}>
            <input
              type="checkbox"
              name="example"
              id="exampleCheckbox"
              checked={isCheckboxChecked}
              onChange={handleCheckboxChange}
            />
            <p>
              I declare that the data I have entered is complete and correct. I
              also agree that this data may be shared with local authorities to
              confirm that the information is accurate and meets legal
              requirements.
            </p>
          </div>
        )}
      </div>
      <hr></hr>
      <div className={styles["bottom-container"]}>
        <OnboardingButton
          routePath={accommodationType ? `/hostonboarding/${accommodationType}/availability` : "/hostonboarding"} // Fallback route
          btnText="Go back"
        />
        <OnboardingButton
          onClick={handleProceed}
          btnText="Proceed"
          disabled={isProceedDisabled}
        />
      </div>
      {errorMessages.length > 0 && (
        <div className="error-message" style={{ marginTop: '10px', color: 'red' }}>
          {errorMessages.map((msg, index) => (
            <p key={index}>{msg}</p>
          ))}
        </div>
      )}
    </main>
  );
};
export default RegistrationNumber;