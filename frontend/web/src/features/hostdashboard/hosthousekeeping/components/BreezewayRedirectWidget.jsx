import React from "react";

const BreezewayRedirectWidget = () => {
  const redirectToBreezeway = () => {
    window.location.href = "https://www.breezeway.io/";
  };

  return (
    <button onClick={redirectToBreezeway}>
      Go to Breezeway
    </button>
  );
};

export default BreezewayRedirectWidget;
