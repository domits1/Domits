import React from "react";

const Header = ({title}) => {
  return (
    <section className="listing-details-header">
      <h2 className="title">{title}</h2>
    </section>
  );
};

export default Header;
