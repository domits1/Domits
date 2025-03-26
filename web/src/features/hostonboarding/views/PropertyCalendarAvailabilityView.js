import React from "react";
import CalendarComponent from "../../hostdashboard/CalendarComponent";
import { useParams } from "react-router-dom";
import StayControl from "../components/StayControl";
import { useAvailability } from "../hooks/usePropertyCalenderAvailability";
import Button from "../components/button";
import { useHandleLegalProceed } from "../hooks/usePropertyRegistrationNumber";

function AvailabilityView() {
  const { type: accommodationType } = useParams();
  const {
    availability,
    updateSelectedDates,
    incrementAmount,
    decrementAmount,
  } = useAvailability();

  const { handleProceed } = useHandleLegalProceed();

  return (
    <main className="container">
      <h2 className="onboardingSectionTitle">Share your first availability</h2>
      <p className="onboardingSectionSubtitle">
        You can edit and delete availabilities later within your dashboard
      </p>

      <CalendarComponent
        passedProp={availability}
        isNew={true}
        updateDates={updateSelectedDates}
      />

      <div className="staying_nights">
        <div className="stayMinMaxBox">
          <StayControl
            label="Minimum Stay (Days):"
            value={availability.MinimumStay}
            onIncrement={() => incrementAmount("MinimumStay", 1, 30)}
            onDecrement={() => decrementAmount("MinimumStay", 1, 1)}
          />
          <StayControl
            label="Minimum Booking Period (Days):"
            value={availability.MinimumBookingPeriod}
            onIncrement={() => incrementAmount("MinimumBookingPeriod", 1, 60)}
            onDecrement={() => decrementAmount("MinimumBookingPeriod", 1, 1)}
          />
          <StayControl
            label="Maximum Stay (Days):"
            value={availability.MaximumStay}
            onIncrement={() => incrementAmount("MaximumStay", 1, 365)}
            onDecrement={() => decrementAmount("MaximumStay", 1, 1)}
          />
          <StayControl
            label="Payment Deadline After Booking (Hours):"
            value={availability.PaymentDeadlineAfterBooking}
            onIncrement={() =>
              incrementAmount("PaymentDeadlineAfterBooking", 1, 168)
            }
            onDecrement={() =>
              decrementAmount("PaymentDeadlineAfterBooking", 1, 1)
            }
          />
          <StayControl
            label="Payment Deadline Before Check-In (Hours):"
            value={availability.PaymentDeadlineBeforeCheckIn}
            onIncrement={() =>
              incrementAmount("PaymentDeadlineBeforeCheckIn", 1, 168)
            }
            onDecrement={() =>
              decrementAmount("PaymentDeadlineBeforeCheckIn", 1, 1)
            }
          />
          <StayControl
            label="Reservation Expiration Time (Hours):"
            value={availability.ExpirationTime}
            onIncrement={() => incrementAmount("ExpirationTime", 1, 168)}
            onDecrement={() => decrementAmount("ExpirationTime", 1, 1)}
          />
        </div>
      </div>

      <nav className="onboarding-button-box">
        <Button
          routePath={`/hostonboarding/${accommodationType}/pricing`}
          btnText="Go back"
        />
        <Button onClick={handleProceed} btnText="Proceed" />
      </nav>
    </main>
  );
}

export default AvailabilityView;
