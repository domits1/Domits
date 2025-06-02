import React from "react";

const TurnoRedirectWidget = () => {
  const redirectToTurno = () => {
    window.location.href = "https://turno.com/";
  };

  return (
    <button onClick={redirectToTurno}>
      Go to Turno
    </button>
  );
};

export default TurnoRedirectWidget;
