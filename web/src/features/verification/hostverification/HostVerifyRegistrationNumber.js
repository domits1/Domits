import React, { useState } from "react"
import styles from "./hostverification.module.css"
import Loading from "./components/Loading"
import useIsRegistrationNumberRequired from "./hooks/useIsRegistrationNumberRequired"
import useFormStoreHostOnboarding from "../../hostonboarding/stores/formStoreHostOnboarding"
import OnboardingButton from "../../hostonboarding/components/OnboardingButton"
import { useBuilder } from "../../../context/propertyBuilderContext";

const RegistrationNumber = () => {
  const builder = useBuilder();
  const form = useFormStoreHostOnboarding();
  const accommodationType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  )
  const address = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.address,
  )

  const [registrationNumber, setRegistrationNumber] = useState("");

  const { isRegistrationNumberRequired, loading, error } =
    useIsRegistrationNumberRequired(address)

  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false)

  if (loading) {
    return <Loading />
  }
  if (error) {
    return <p>Something went wrong {error.message}</p>
  }
  return (
    <main className={styles["verification-container"]}>
      <div className={styles["headertext-container"]}>
        <h1>Add your registration number</h1>
        <p>
          Your registration number will appear on your listing page, so that
          guests know that your accommodation is registered in {address.city}.
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
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}></input>
        </div>
        <div className={styles["registrationnumber-address"]}>
          <h2>Listing address</h2>
          <p>
            {address.street}, {address.city}, {address.zipCode},{" "}
            {address.country}
          </p>
        </div>
        {isRegistrationNumberRequired && (
          <div className={styles["registrationnumber-legal"]}>
            <input
              type="checkbox"
              name="example"
              id="exampleCheckbox"
              checked={isCheckboxChecked}
              onChange={(e) => setIsCheckboxChecked(e.target.checked)}
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
          routePath={`/hostonboarding/${accommodationType}/availability`}
          btnText="Go back"
        />
        <OnboardingButton
          onClick={() => {
            builder.addProperty({
              title: form.accommodationDetails.title,
              subtitle: form.accommodationDetails.subtitle,
              description: form.accommodationDetails.description,
              guestCapacity: form.accommodationDetails.accommodationCapacity.GuestAmount,
              registrationNumber: registrationNumber,
              status: "",
              propertyType: accommodationType,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }}
          routePath={`/hostonboarding/summary`}
          btnText="Proceed"
        />
      </div>
    </main>
  )
}
export default RegistrationNumber
