import { useParams } from "react-router-dom";
import AddressFormFields from "../components/AddressFormFields";
import useFormStore from "../stores/formStore";
import Button from "../components/button";

function AddressView() {
  const { type: accommodationType } = useParams();
  const addressDetails = useFormStore((state) => state.accommodationDetails.address);
  const setAddressDetails = useFormStore((state) => state.setAddressDetails);

  const handleChange = (newDetails) => {
    setAddressDetails({ ...addressDetails, ...newDetails });
  };

  const isProceedDisabled = !addressDetails.country || !addressDetails.city || !addressDetails.street || !addressDetails.zipCode;

  return (
    <main className="page-body">
      <h2 className="onboardingSectionTitle">Address</h2>
      <AddressFormFields
        type={accommodationType}
        details={addressDetails}
        handleChange={handleChange}
        countryOptions={/* your country options here */}
      />
      <nav className="onboarding-button-box">
        <Button routePath={`/hostonboarding/${accommodationType}/guest-amount`} btnText="Go back" />
        <Button routePath={`/hostonboarding/${accommodationType}/amenities`} btnText="Proceed" disabled={isProceedDisabled} className={isProceedDisabled ? "button-disabled" : ""} />
      </nav>
    </main>
  );
}

export default AddressView;
