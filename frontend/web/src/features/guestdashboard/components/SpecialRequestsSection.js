import React, { useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { updateBookingSpecialRequest } from "../services/bookingAPI";

function SpecialRequestsSection({ bookingId, specialRequest, onUpdated }) {
  const [value, setValue] = useState(specialRequest || "");
  const [savedValue, setSavedValue] = useState(specialRequest || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasChanges = value !== savedValue;

  const handleSubmit = async () => {
    if (!bookingId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateBookingSpecialRequest(bookingId, value);
      if (result?.persisted === false) {
        toast.error("Special requests aren't available yet — try again later.");
      } else {
        toast.success("Special request updated.");
        setSavedValue(value);
        if (onUpdated) {
          onUpdated(value);
        }
      }
    } catch (error) {
      console.error("Failed to update special request:", error);
      toast.error("Could not update your special request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3>Special requests</h3>
      <p>Let the host know about anything specific — early check-in, extra bedding, etc.</p>

      <textarea
        className="specialRequestInput"
        aria-label="Special request"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Late check-in around 9pm, extra pillows if possible"
        rows={3}
        disabled={isSubmitting}
      />

      <button
        type="button"
        className="primaryBtn specialRequestSubmitBtn"
        onClick={handleSubmit}
        disabled={!hasChanges || isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save request"}
      </button>
    </div>
  );
}

SpecialRequestsSection.propTypes = {
  bookingId: PropTypes.string,
  specialRequest: PropTypes.string,
  onUpdated: PropTypes.func,
};

export default SpecialRequestsSection;
