import React from "react";

export default function IconWrapper({ children }) {
  return React.cloneElement(children, {
    sx: {
      color: "var(--primary-color)",
      fontSize: 18,  // Holidu-size
      padding: "4px",
    },
  });
}
