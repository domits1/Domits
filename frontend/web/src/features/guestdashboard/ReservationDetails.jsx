import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../styles/sass/features/guestdashboard/guestReservationDetail.scss";
import "../../styles/sass/features/guestdashboard/mainDashboardGuest.scss";

import PropertyCard from "./components/PropertyCard";
import CheckInInstructions from "./components/CheckInInstructions";
import HouseRules from "./components/HouseRules";
import PaymentSummary from "./components/PaymentSummary";
import BookingDetails from "./components/BookingDetails";

import mockReservationDetails from "./utils/mockReservationDetails";

function ReservationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // For now using mock (later replace with API)
  const reservation = mockReservationDetails;

  const handleBack = () => {
    navigate("/guestdashboard");
  };

  const handleDownload = () => {
    console.log("Download invoice");
  };

  if (!reservation) {
    return <p>Reservation not found</p>;
  }

  return (
    <div className="dashboardContainer">
      <div className="dashboardLeft">
        {/* Back button */}
        <button type="button" className="viewAll" onClick={handleBack}>
          ← Back to all trips
        </button>

        {/* Title + Status */}
        <h1>{reservation.property.name}</h1>
        <span className="confirmed">● {reservation.stay.status}</span>

        <div className="mainGrid">
          {/* LEFT COLUMN */}
          <div>
            <PropertyCard
              image={reservation.property.image}
              title={reservation.property.title}
              location={reservation.property.location}
              checkIn={reservation.stay.checkIn}
              checkInTime={reservation.stay.checkInTime}
              checkOutTime={reservation.stay.checkOutTime}
              checkOut={reservation.stay.checkOut}
              guests={reservation.stay.guests}
              guestsDetails={reservation.stay.guestsDetails}
              reservationId={reservation.stay.id}
            />

            <CheckInInstructions
              address={reservation.property.address}
              instructions={reservation.instructions}
            />
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <HouseRules
              rules={reservation.rules}
              cancellationPolicy={{
                type: "Flexible",
                description:
                  "Free cancellation until 5 Oct 2026. After that, first night non-refundable.",
              }}
            />

            <div className="card helpCard">
              <h3>Need help?</h3>
              <button type="button" className="primaryBtn">
                Message host
              </button>
            </div>

            <PaymentSummary
              nightlyRate={reservation.pricing.nightlyRate}
              nights={reservation.pricing.nights}
              cleaningFee={reservation.pricing.cleaningFee}
            />

            <BookingDetails
              reservationId={reservation.stay.id}
              bookedDate={reservation.stay.bookedAt || "20 Sep 2026"}
              onDownload={handleDownload}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReservationDetails;