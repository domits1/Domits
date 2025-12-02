import React from "react";

export default function IconWrapper({ children }) {
  return React.cloneElement(children, {
    sx: {
      color: "var(--primary-color)",
      fontSize: 18,
      padding: "4px",
    },
  });
}
