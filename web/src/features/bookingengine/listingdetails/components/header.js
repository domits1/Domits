import { Link } from "react-router-dom";
import React from "react";

const Header = ({title}) => {
  return (
    <section className="listing-details-header">
      <Link to="/home">
        <p className="backButton">Go Back</p>
      </Link>
      <h2 className="title">{title}</h2>
    </section>
  );
};

export default Header;
