import React from "react";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";
import emptyImg from "../../../images/empty-state.png";
import { useNavigate } from "react-router-dom";

function EmptyState() {
  const navigate = useNavigate();

  return (
    <div className="card">
      <h3>No upcoming trips</h3>

      <div className="emptyBox">
        <img src={emptyImg} alt="No trips" />

        <div>
          <p>You have no upcoming stays. Explore destinations.</p>

          <button type="button" onClick={() => navigate("/search")}>
            Browse stays
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmptyState;