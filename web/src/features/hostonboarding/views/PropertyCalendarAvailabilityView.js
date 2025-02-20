import React from 'react'
import CalendarComponent from '../../hostdashboard/CalendarComponent'
import {useParams} from 'react-router-dom'
import StayControl from '../components/StayControl'
import {useAvailability} from '../hooks/useAvailability'
import Button from '../components/button'
import {useHandleLegalProceed} from '../hooks/useHandleLegalProceed'

function AvailabilityView() {
  const {type: accommodationType} = useParams()
  const {availability, updateSelectedDates, incrementAmount, decrementAmount} =
    useAvailability()

  const {handleProceed} = useHandleLegalProceed()

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
            onIncrement={() => incrementAmount('MinimumStay', 30)}
            onDecrement={() => decrementAmount('MinimumStay', 1)}
          />
          <StayControl
            label="Minimum Booking Period (Days):"
            value={availability.MinimumBookingPeriod}
            onIncrement={() => incrementAmount('MinimumBookingPeriod', 30)}
            onDecrement={() => decrementAmount('MinimumBookingPeriod', 1)}
          />
          <StayControl
            label="Maximum Stay (Days):"
            value={availability.MaximumStay}
            onIncrement={() => incrementAmount('MaximumStay', 365)}
            onDecrement={() => decrementAmount('MaximumStay', 1)}
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
  )
}

export default AvailabilityView
