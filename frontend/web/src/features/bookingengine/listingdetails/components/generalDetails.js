import React from "react";

const GeneralDetails = ({generalDetails}) => {
  return (
    <p className="details">
      {generalDetails
        .map((detail) => `${detail.value} ${detail.detail}`)
        .join(" - ")}
    </p>
  );
};

export default GeneralDetails;