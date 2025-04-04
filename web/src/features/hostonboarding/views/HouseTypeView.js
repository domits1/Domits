// Desc: dependend step 2 - Choose the type of guest access you want to list on the platform

import GuestAccessTypeSelector from "../components/GuestAccessTypeSelector";
import OnboardingButton from "../components/OnboardingButton";

function GuestAccessView() {
  return (
    <main className="container">
      <section className="guest-access">
        <h2 className="onboardingSectionTitle">
          What kind of space do your guests have access to?
        </h2>
        <GuestAccessTypeSelector
          header="Entire house"
          description="Guests have the entire space to themselves"
        />
        <GuestAccessTypeSelector
          header="Private room"
          description="Guests have their own private room for sleeping"
        />
        <GuestAccessTypeSelector
          header="Shared room"
          description="Guests sleep in a room or common area that they may share with you or others"
        />
      </section>

      <nav className="onboarding-button-box">
        <OnboardingButton routePath="/hostonboarding" btnText="Go back" />
        <OnboardingButton routePath="/hostonboarding/accommodation/address" btnText="Proceed" />
      </nav>
    </main>
  );
}

export default GuestAccessView;
