import React from "react";
import PropTypes from "prop-types";

export default function IconWrapper({ children, sx = {}, className = "", ...restProps }) {
  if (!React.isValidElement(children)) {
    return null;
  }

  const baseSx = {
    color: "var(--primary-color)",
    fontSize: 18,
    padding: "4px",
  };
  const childSx = children.props?.sx && typeof children.props.sx === "object" ? children.props.sx : {};
  const mergedClassName = [children.props?.className || "", className].filter(Boolean).join(" ").trim();

  return React.cloneElement(children, {
    ...restProps,
    className: mergedClassName || undefined,
    sx: {
      ...baseSx,
      ...childSx,
      ...(typeof sx === "object" ? sx : {}),
    },
  });
}

IconWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
  className: PropTypes.string,
};
