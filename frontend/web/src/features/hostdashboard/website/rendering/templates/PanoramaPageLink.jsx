import React from "react";
import PropTypes from "prop-types";
import { Link, useInRouterContext } from "react-router-dom";

export default function PanoramaPageLink({ href, ariaCurrent, onNavigate, className, children }) {
  const isInRouter = useInRouterContext();
  if (!isInRouter) {
    return (
      <a href={href} aria-current={ariaCurrent} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href} aria-current={ariaCurrent} onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}

PanoramaPageLink.propTypes = {
  href: PropTypes.string.isRequired,
  ariaCurrent: PropTypes.oneOf(["page"]),
  onNavigate: PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
