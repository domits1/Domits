import React from "react";

const GeneralDetails = ({ generalDetails = [] }) => {
  if (!Array.isArray(generalDetails) || generalDetails.length === 0) {
    return null;
  }

  return (
    <p className="details">
      {generalDetails
        .map((detail) => `${detail.value} ${detail.detail}`)
        .join(" - ")}
    </p>
  );
};

export default GeneralDetails;