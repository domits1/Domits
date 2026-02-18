import React, { useState } from "react"
import styles from "./hostverification.module.css"
import useFormStoreHostOnboarding from "../../hostonboarding/stores/formStoreHostOnboarding"
import OnboardingButton from "../../hostonboarding/components/OnboardingButton"
import { useBuilder } from "../../../context/propertyBuilderContext";
import OnboardingProgress from "../../hostonboarding/components/OnboardingProgress"
import { useOnboardingFlow } from "../../hostonboarding/hooks/useOnboardingFlow"

const RegistrationNumber = () => {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const form = useFormStoreHostOnboarding();
  const accommodationType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  )
  const location = useFormStoreHostOnboarding(
    (state) => state.location,
  )

  const [registrationNumber, setRegistrationNumber] = useState("");
  return (
    <div className="onboarding-host-div">
      <main className="container">
        <OnboardingProgress />
        <div className={`${styles["verification-container"]} onboarding-verification`}>
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
              <h2>Registration number (optional)</h2>
              <input
                type="text"
                placeholder="For example: 'Abcd 1234 AB12 89EF A0F9'"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}></input>
            </div>
            <div className={styles["registrationnumber-address"]}>
              <h2>Listing address</h2>
              <p>
                {location.street}, {location.city}, {location.postalCode},{" "}
                {location.country}
              </p>
            </div>
          </div>
          <hr></hr>
          <div className={styles["bottom-container"]}>
            <OnboardingButton
              routePath={prevPath || `/hostonboarding/${accommodationType}/availability`}
              btnText="Go back"
            />
            <OnboardingButton
              onClick={() => {
                builder.addProperty({
                  title: form.accommodationDetails.title,
                  subtitle: form.accommodationDetails.subtitle,
                  description: form.accommodationDetails.description,
                  guestCapacity: form.accommodationDetails.accommodationCapacity.GuestAmount,
                  registrationNumber: registrationNumber.trim(),
                  status: "",
                  propertyType: accommodationType,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                });
              }}
              routePath={nextPath || `/hostonboarding/summary`}
              btnText="Proceed"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
export default RegistrationNumber